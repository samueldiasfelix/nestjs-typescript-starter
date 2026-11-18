import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  /** scrypt hash from `PasswordHasher`; `null` for accounts without a password. */
  passwordHash: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** A user as the app hands it around: never with the password hash. */
export type User = Omit<typeof users.$inferSelect, 'passwordHash'>;
