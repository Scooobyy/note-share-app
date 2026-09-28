import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { createSession, destroySession, getSession } from '@/lib/auth/session';
import { registerSchema, loginSchema } from '@/lib/validation';

export const authRoutes = new Hono()
  .post('/register', zValidator('json', registerSchema), async (c) => {
    const { email, password } = c.req.valid('json');
    const normalized = email.toLowerCase().trim();

    const existing = await db.query.users.findFirst({
      where: eq(users.email, normalized),
    });
    if (existing) {
      return c.json({ error: 'Email already registered' }, 409);
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ email: normalized, passwordHash })
      .returning({ id: users.id, email: users.email });

    await createSession({ userId: user.id, email: user.email });
    return c.json({ user }, 201);
  })
  .post('/login', zValidator('json', loginSchema), async (c) => {
    const { email, password } = c.req.valid('json');
    const normalized = email.toLowerCase().trim();

    const user = await db.query.users.findFirst({
      where: eq(users.email, normalized),
    });
    // Constant-ish response to prevent user enumeration
    if (!user) {
      await verifyPassword(password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalid');
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return c.json({ error: 'Invalid credentials' }, 401);

    await createSession({ userId: user.id, email: user.email });
    return c.json({ user: { id: user.id, email: user.email } });
  })
  .post('/logout', async (c) => {
    await destroySession();
    return c.json({ ok: true });
  })
  .get('/me', async (c) => {
    const session = await getSession();
    if (!session) return c.json({ user: null }, 200);
    return c.json({ user: session });
  });