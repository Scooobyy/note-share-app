import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { authRoutes } from './routes/auth';
import { noteRoutes } from './routes/notes';
import { shareRoutes } from './routes/share';

export const runtime = 'nodejs';

const app = new Hono().basePath('/api/hono');

app.onError((err, c) => {
  console.error('[hono]', err);
  return c.json({ error: 'Internal server error' }, 500);
});

app.get('/health', (c) => c.json({ ok: true }));

app.route('/auth', authRoutes);
app.route('/notes', noteRoutes);
app.route('/share', shareRoutes);

export { app };

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);