import { Module } from '@nestjs/common';
import { LocksModule } from '@nestjs/locks';
import { DrizzleLockStore } from './drizzle-lock.store.js';

/**
 * Distributed locks in Postgres. Next to `@Cron()`, `@OnOneInstance()` runs a
 * job on one instance only; `Locks.withLock()` guards any other critical section.
 */
@Module({
  imports: [LocksModule.forRoot()],
  providers: [DrizzleLockStore],
})
export class AppLocksModule {}
