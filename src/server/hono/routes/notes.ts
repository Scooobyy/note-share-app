import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { notes, shares } from '@/lib/db/schema';
import { createNoteSchema } from '@/lib/validation';
import { requireAuth } from '../middleware/auth';
import { generateShareToken, hashToken, generateAccessKey } from '@/lib/tokens';
import { hashPassword } from '@/lib/auth/password';


export const noteRoutes = new Hono<{ Variables: { user: { userId: string; email: string } } }>()
  .use('*', requireAuth)
  .post('/', zValidator('json', createNoteSchema), async (c) => {
    const user = c.get('user');
    const body = c.req.valid('json');

    const noteExpiry = new Date(body.expiresAt);
    if (noteExpiry <= new Date()) {
      return c.json({ error: 'Expiry must be in the future' }, 400);
    }

    // For TIME_BASED, share expiry defaults to note expiry if not given
    const shareExpiry =
      body.shareType === 'TIME_BASED'
        ? new Date(body.shareExpiresAt ?? body.expiresAt)
        : noteExpiry;

    if (shareExpiry <= new Date()) {
      return c.json({ error: 'Share expiry must be in the future' }, 400);
    }

    // Generate token + (optional) password
    const rawToken = generateShareToken();
    const tokenHash = hashToken(rawToken);

    let rawPassword: string | null = null;
    let passwordHash: string | null = null;
    if (body.accessType === 'PASSWORD') {
      rawPassword = generateAccessKey();
      passwordHash = await hashPassword(rawPassword);
    }

    // Transaction: note + share created atomically
    const result = await db.transaction(async (tx) => {
      const [note] = await tx
        .insert(notes)
        .values({
          userId: user.userId,
          title: body.title,
          content: body.content,
          expiresAt: noteExpiry,
          shareType: body.shareType,
          accessType: body.accessType,
        })
        .returning();

      const [share] = await tx
        .insert(shares)
        .values({
          noteId: note.id,
          tokenHash,
          passwordHash,
          shareType: body.shareType,
          accessType: body.accessType,
          expiresAt: shareExpiry,
        })
        .returning();

      return { note, share };
    });

    return c.json(
      {
        note: result.note,
        share: {
          id: result.share.id,
          shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/share/${rawToken}`,
          // Show password ONLY at creation time
          password: rawPassword,
          shareType: result.share.shareType,
          accessType: result.share.accessType,
          expiresAt: result.share.expiresAt,
        },
      },
      201
    );
  })
  .get('/:id', async (c) => {
    const user = c.get('user');
    const id = c.req.param('id');

    const note = await db.query.notes.findFirst({
      where: and(eq(notes.id, id), eq(notes.userId, user.userId)),
    });
    if (!note) return c.json({ error: 'Not found' }, 404);

    const shareList = await db
      .select({
        id: shares.id,
        shareType: shares.shareType,
        accessType: shares.accessType,
        expiresAt: shares.expiresAt,
        revokedAt: shares.revokedAt,
        usedAt: shares.usedAt,
        viewCount: shares.viewCount,
        createdAt: shares.createdAt,
      })
      .from(shares)
      .where(eq(shares.noteId, note.id));

    return c.json({ note, shares: shareList });
  });