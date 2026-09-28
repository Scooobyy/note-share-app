import { config } from 'dotenv';
config({ path: '.env' });

import type { Config } from 'drizzle-kit';

const cfg: Config = {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
  verbose: true,
  strict: true,
};

export default cfg;