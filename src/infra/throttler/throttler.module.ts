import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { seconds, ThrottlerModule } from '@nestjs/throttler';
import { Env } from '../../config/env.schema.js';
import { RedisThrottlerStorage } from './redis-throttler.storage.js';

@Module({
  providers: [RedisThrottlerStorage],
  exports: [RedisThrottlerStorage],
})
export class ThrottlerStorageModule {}

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
      ) => ({
        throttlers: [
          { name: 'short', ttl: seconds(1), limit: 3 },
          { name: 'medium', ttl: seconds(10), limit: 20 },
          { name: 'long', ttl: seconds(60), limit: 100 },
        ],
        storage,
        // The e2e specs share one client IP and one Redis; the throttler spec turns it back on.
        skipIf: () => config.get('NODE_ENV', { infer: true }) === 'test',
      }),
    }),
  ],
})
export class AppThrottlerModule {}
