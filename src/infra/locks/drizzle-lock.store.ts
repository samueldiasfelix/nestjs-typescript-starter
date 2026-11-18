import { Injectable } from '@nestjs/common';
import {
  type LockAcquireResult,
  type LockStore,
  LocksStorage,
} from '@nestjs/locks';
import { and, eq, gt, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import { locks } from './lock.entity.js';

// Expiry runs on the database's clock, the one every instance shares.
const expiresIn = (ttl: number) =>
  sql`clock_timestamp() + ${ttl} * interval '1 millisecond'`;

const heldBy = (key: string, owner: string) =>
  and(
    eq(locks.key, key),
    eq(locks.owner, owner),
    gt(locks.expiresAt, sql`clock_timestamp()`),
  );

/** `@nestjs/locks` leases in Postgres, so every instance sees the same locks. */
@Injectable()
export class DrizzleLockStore implements LockStore {
  constructor(
    private readonly database: DatabaseService,
    storage: LocksStorage,
  ) {
    storage.registerSource(this);
  }

  async acquire(
    key: string,
    owner: string,
    ttl: number,
  ): Promise<LockAcquireResult> {
    // One statement: takes a free key, or one whose lock was released or expired.
    const [row] = await this.database.db
      .insert(locks)
      .values({
        key,
        owner,
        fencingToken: sql`nextval('locks_fencing_token_seq')`,
        expiresAt: expiresIn(ttl),
      })
      .onConflictDoUpdate({
        target: locks.key,
        set: {
          owner,
          fencingToken: sql`greatest(nextval('locks_fencing_token_seq'), ${locks.fencingToken} + 1)`,
          expiresAt: expiresIn(ttl),
        },
        setWhere: sql`${locks.owner} is null or ${locks.expiresAt} <= clock_timestamp()`,
      })
      .returning({ fencingToken: locks.fencingToken });
    return row
      ? { acquired: true, fencingToken: row.fencingToken }
      : { acquired: false };
  }

  async renew(key: string, owner: string, ttl: number): Promise<boolean> {
    const rows = await this.database.db
      .update(locks)
      .set({ expiresAt: expiresIn(ttl) })
      .where(heldBy(key, owner))
      .returning({ key: locks.key });
    return rows.length === 1;
  }

  async release(key: string, owner: string): Promise<boolean> {
    const rows = await this.database.db
      .update(locks)
      .set({ owner: null })
      .where(heldBy(key, owner))
      .returning({ key: locks.key });
    return rows.length === 1;
  }
}
