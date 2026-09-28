import { createMiddleware } from 'hono/factory';
import { db } from '@/lib/db';
import { shareAttempts } from '@/lib/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

const WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 5;

export const passwordRateLimit = createMiddleware(async (c, next) => {
  const shareId = c.get('shareId') as string | undefined;
  if (!shareId) return c.json({ error: 'Bad request' }, 400);

  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    c.req.header('x-real-ip') ||
    'unknown';

  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(shareAttempts)
    .where(
      and(
        eq(shareAttempts.shareId, shareId),
        eq(shareAttempts.ip, ip),
        eq(shareAttempts.success, false),
        gte(shareAttempts.createdAt, since)
      )
    );

  if (count >= MAX_ATTEMPTS) {
    return c.json(
      { error: 'Too many attempts. Try again later.' },
      429
    );
  }

  await next();
});

export async function recordAttempt(shareId: string, ip: string, success: boolean) {
  await db.insert(shareAttempts).values({ shareId, ip, success });
}

export function getClientIp(c: any): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    c.req.header('x-real-ip') ||
    'unknown'
  );
}