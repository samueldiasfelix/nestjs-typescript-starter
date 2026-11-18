import { createKeyv } from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.schema.js';

/** Default entry lifetime. Without one, entries would never expire. */
const DEFAULT_TTL_MS = 60_000;

/**
 * Cache backed by the app's Redis (the one BullMQ uses), with keys under the
 * `cache` namespace. Global: inject `CACHE_MANAGER`, or opt a GET route in with
 * `@UseInterceptors(CacheInterceptor)`.
 */
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const password = config.get('REDIS_PASSWORD', { infer: true });
        const auth = password ? `:${encodeURIComponent(password)}@` : '';
        const host = config.get('REDIS_HOST', { infer: true });
        const port = config.get('REDIS_PORT', { infer: true });

        const store = createKeyv(`redis://${auth}${host}:${port}`, {
          namespace: 'cache',
        });
        // Without a listener, a dropped connection throws and can crash the app.
        const logger = new Logger('Cache');
        store.on('error', (error: unknown) =>
          logger.error('Redis cache error', error),
        );

        return { stores: [store], ttl: DEFAULT_TTL_MS };
      },
    }),
  ],
})
export class AppCacheModule {}
