import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Needs a running Postgres: `docker compose up -d`.
    globalSetup: ['./tests/e2e/setup/migrate.ts'],
  },
});
