import { createMiddleware } from 'hono/factory';
import { getSession, type SessionPayload } from '@/lib/auth/session';

export type AuthVars = {
  user: SessionPayload;
};

export const requireAuth = createMiddleware<{ Variables: AuthVars }>(async (c, next) => {
  const session = await getSession();
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  c.set('user', session);
  await next();
});