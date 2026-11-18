import {
  Global,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { Env } from '../../config/env.schema.js';

/**
 * One Redis connection for the app's own commands (rate limiting, health
 * checks), injected as `Redis`. Commands fail fast instead of queueing while
 * Redis is down. BullMQ and the cache keep their own connections.
 */
@Global()
@Module({
  providers: [
    {
      provide: Redis,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const logger = new Logger('Redis');
        const redis = new Redis({
          host: config.get('REDIS_HOST', { infer: true }),
          port: config.get('REDIS_PORT', { infer: true }),
          password: config.get('REDIS_PASSWORD', { infer: true }),
          // Requests at boot wait for the first connection, but never longer than this.
          commandTimeout: 500,
          maxRetriesPerRequest: 1,
        });
        // Without a listener, connection errors are reported as unhandled.
        redis.on('error', (error) => logger.debug(error.message));
        return redis;
      },
    },
  ],
  exports: [Redis],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(private readonly redis: Redis) {}

  async onApplicationShutdown() {
    await this.redis.quit().catch(() => this.redis.disconnect());
  }
}
