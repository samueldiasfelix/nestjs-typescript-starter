import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './schema.js';

export type Database = NodePgDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * The app's database. Feature modules inject this instead of `@InjectDrizzle()`,
 * so they don't depend on the driver's types.
 */
@Injectable()
export class DatabaseService {
  constructor(@InjectDrizzle() readonly db: Database) {}

  /** Runs `fn` in a transaction: it commits when `fn` resolves, rolls back when it throws. */
  transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }
}
