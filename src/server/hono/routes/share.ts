import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, and, isNull, gt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { notes, shares } from '@/lib/db/schema';
import { requireAuth } from '../middleware/auth';
import { hashToken } from '@/lib/tokens';
import { verifyPassword } from '@/lib/auth/password';
import { passwordRateLimit, recordAttempt, getClientIp } from '../middleware/rateLimit';

const viewSchema = z.object({
  password: z.string().min(1).max(128).optional(),
});

export const shareRoutes = new Hono()
  // ---------- PUBLIC: read-only inspection (never mutates) ----------
  .get('/:token', async (c) => {
    const token = c.req.param('token');
    const tokenHash = hashToken(token);

    const share = await db.query.shares.findFirst({
      where: eq(shares.tokenHash, tokenHash),
    });

    if (!share) return c.json({ status: 'invalid' }, 404);

    const state = evaluateShareState(share);
    if (state !== 'ok') {
      const code = state === 'expired' || state === 'used' ? 410 : 403;
      return c.json({ status: state }, code);
    }

    if (share.accessType === 'PASSWORD') {
      return c.json({ status: 'needs_password', accessType: 'PASSWORD' });
    }

    // Public → tell client it's ready; don't reveal content yet
    return c.json({ status: 'ready_to_view', accessType: 'PUBLIC' });
  })

  // ---------- PUBLIC: consume + return content (mutates) ----------
  .post(
    '/:token/view',
    async (c, next) => {
      // Load share for rate-limit context
      const token = c.req.param('token');
      const share = await db.query.shares.findFirst({
        where: eq(shares.tokenHash, hashToken(token)),
      });
      if (!share) return c.json({ status: 'invalid' }, 404);
      c.set('shareId', share.id);
      c.set('share', share);
      await next();
    },
    passwordRateLimit,
    zValidator('json', viewSchema),
    async (c) => {
      const share = c.get('share') as any;
      const ip = getClientIp(c);
      const body = c.req.valid('json');

      // Re-check state (middleware may have raced)
      const state = evaluateShareState(share);
      if (state !== 'ok') {
        const code = state === 'expired' || state === 'used' ? 410 : 403;
        return c.json({ status: state }, code);
      }

      // Password path: verify first, atomically claim second
      if (share.accessType === 'PASSWORD') {
        if (!body.password) return c.json({ status: 'needs_password' }, 400);
        if (!share.passwordHash) return c.json({ error: 'Not configured' }, 500);

        const ok = await verifyPassword(body.password, share.passwordHash);
        if (!ok) {
          await recordAttempt(share.id, ip, false);
          return c.json({ status: 'wrong_password' }, 401);
        }
      }

      // Atomic claim + increment. This is the ONLY place view_count changes.
      const claimed = await atomicClaim(share.id, share.shareType);
      if (!claimed) return c.json({ status: 'used' }, 410);

      if (share.accessType === 'PASSWORD') {
        await recordAttempt(share.id, ip, true);
      }

      const note = await db.query.notes.findFirst({ where: eq(notes.id, share.noteId) });
      return c.json({
        status: 'ok',
        note: { title: note!.title, content: note!.content },
      });
    }
  )

  // ---------- AUTHENTICATED: revoke ----------
  .post('/:shareId/revoke', requireAuth, async (c) => {
    const user = c.get('user');
    const shareId = c.req.param('shareId');

    const share = await db.query.shares.findFirst({ where: eq(shares.id, shareId) });
    if (!share) return c.json({ error: 'Not found' }, 404);

    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, share.noteId), eq(notes.userId, user.userId)),
    });
    if (!note) return c.json({ error: 'Forbidden' }, 403);

    await db.update(shares).set({ revokedAt: new Date() }).where(eq(shares.id, shareId));
    return c.json({ ok: true });
  });

type ShareState = 'ok' | 'expired' | 'revoked' | 'used';

function evaluateShareState(share: {
  expiresAt: Date;
  revokedAt: Date | null;
  usedAt: Date | null;
  shareType: string;
}): ShareState {
  if (share.revokedAt) return 'revoked';
  if (share.expiresAt <= new Date()) return 'expired';
  if (share.shareType === 'ONE_TIME' && share.usedAt) return 'used';
  return 'ok';
}

async function atomicClaim(shareId: string, shareType: string): Promise<boolean> {
  if (shareType === 'ONE_TIME') {
    const rows = await db
      .update(shares)
      .set({
        usedAt: sql`NOW()`,
        viewCount: sql`${shares.viewCount} + 1`,
      })
      .where(
        and(
          eq(shares.id, shareId),
          isNull(shares.usedAt),
          isNull(shares.revokedAt),
          gt(shares.expiresAt, sql`NOW()`)
        )
      )
      .returning({ id: shares.id });
    return rows.length === 1;
  }

  const rows = await db
    .update(shares)
    .set({ viewCount: sql`${shares.viewCount} + 1` })
    .where(
      and(
        eq(shares.id, shareId),
        isNull(shares.revokedAt),
        gt(shares.expiresAt, sql`NOW()`)
      )
    )
    .returning({ id: shares.id });
  return rows.length === 1;
}