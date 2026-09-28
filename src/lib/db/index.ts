import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Reuse connection across hot reloads in dev
const globalForDb = globalThis as unknown as { _pg?: postgres.Sql };

const client =
  globalForDb._pg ??
  postgres(process.env.DATABASE_URL!, {
    max: 10,                 // pool size (Vercel serverless: keep low)
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,          // required for Neon pooled connections
  });

if (process.env.NODE_ENV !== 'production') globalForDb._pg = client;

export const db = drizzle(client, { schema });
export { schema };