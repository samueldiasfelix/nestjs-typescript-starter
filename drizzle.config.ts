import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';
import { envSchema } from './src/env.schema.js';

// drizzle-kit runs outside Nest, so load .env and validate it like the app does.
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}
const env = envSchema.parse(process.env);

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
  casing: 'snake_case',
  dbCredentials: { url: env.DATABASE_URL },
});
