import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  minutes,
  normalizeIp,
  seconds,
  ThrottlerModule,
} from '@nestjs/throttler';
import { Env } from '../../config/env.schema.js';
import { RedisThrottlerStorage } from './redis-throttler.storage.js';

@Module({
  providers: [RedisThrottlerStorage],
  exports: [RedisThrottlerStorage],
})
export class ThrottlerStorageModule {}

/** The `email` a request posts (sign-in, sign-up), normalized as the auth schemas do. */
const accountEmail = (req: { body?: { email?: unknown } }) =>
  typeof req.body?.email === 'string'
    ? req.body.email.trim().normalize('NFC').toLowerCase()
    : undefined;

/**
 * Per-client rate limits, counted in Redis so every instance shares them. The
 * global `ThrottlerGuard` (in AppModule) applies them to every route; adjust a
 * route with `@Throttle()` or `@SkipThrottle()`.
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ThrottlerStorageModule],
      inject: [RedisThrottlerStorage, ConfigService],
      useFactory: (
        storage: RedisThrottlerStorage,
        config: ConfigService<Env, true>,
      ) => {
        // The e2e specs share one client IP and one Redis; the throttler spec turns it back on.
        const isTest = config.get('NODE_ENV', { infer: true }) === 'test';
        return {
          throttlers: [
            { name: 'short', ttl: seconds(1), limit: 3 },
            { name: 'medium', ttl: seconds(10), limit: 20 },
            { name: 'long', ttl: seconds(60), limit: 100 },
            // Password guessing against one account: 5 tries per email and IP.
            {
              name: 'account',
              ttl: minutes(15),
              limit: 5,
              // A throttler's own skipIf replaces the module-wide one.
              skipIf: (context) =>
                isTest || !accountEmail(context.switchToHttp().getRequest()),
              getTracker: (req) =>
                `${accountEmail(req)}|${normalizeIp(req.ip)}`,
            },
          ],
          storage,
          skipIf: () => isTest,
        };
      },
    }),
  ],
})
export class AppThrottlerModule {}
