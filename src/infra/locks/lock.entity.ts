import {
  bigint,
  pgSequence,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

/** One row per lock key; a released or expired lock keeps its row. */
export const locks = pgTable('locks', {
  key: text().primaryKey(),
  owner: text(),
  fencingToken: bigint({ mode: 'number' }).notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
});

/** Store-wide fencing tokens: they only grow, across releases and expiries. */
export const locksFencingTokenSeq = pgSequence('locks_fencing_token_seq');
