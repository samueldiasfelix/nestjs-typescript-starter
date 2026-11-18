import { existsSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { envSchema } from '../../../src/config/env.schema.js';

/** Applies the migrations to the compose Postgres before the specs run. */
export default async function setup() {
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }
  const { DATABASE_URL } = envSchema.parse(process.env);
  const db = drizzle(DATABASE_URL);
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
  } finally {
    await db.$client.end();
  }
}
