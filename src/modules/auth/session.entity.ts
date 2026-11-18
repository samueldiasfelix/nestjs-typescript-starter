import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

const at = () => timestamp({ withTimezone: true }).notNull();

/** Sign-in sessions. `id` is the SHA-256 of the cookie token, never the token. */
export const sessions = pgTable(
  'sessions',
  {
    id: text().primaryKey(),
    userId: text().notNull(),
    createdAt: at(),
    expiresAt: at(),
    lastActiveAt: at(),
    mfa: text({ enum: ['pending', 'verified'] }),
    metadata: jsonb().$type<Record<string, unknown>>(),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ],
);
