import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { Redis } from 'ioredis';

// Not exported by @nestjs/throttler's index.
type ThrottlerStorageRecord = Awaited<
  ReturnType<ThrottlerStorage['increment']>
>;

/**
 * One atomic sliding-window step, matching the in-memory `ThrottlerStorageService`:
 * each hit expires on its own (a sorted set scored by expiry time), and a block,
 * once over, starts the count from zero again.
 *
 * KEYS: hits, block. ARGV: now, ttl, limit, blockDuration (all ms), hit id.
 * Returns: totalHits, ms until the oldest hit expires, isBlocked (0/1), ms until the block ends.
 */
const INCREMENT_SCRIPT = `
local now, ttl, limit, block = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4])

local blockLeft = redis.call('PTTL', KEYS[2])
if blockLeft > 0 then
  return { limit + 1, blockLeft, 1, blockLeft }
end

redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)
local hits = redis.call('ZCARD', KEYS[1])

local function untilOldestExpires()
  local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')[2]
  return oldest and (tonumber(oldest) - now) or ttl
end

if block <= 0 then
  if hits >= limit then
    local left = untilOldestExpires()
    return { hits + 1, left, 1, left }
  end
  redis.call('ZADD', KEYS[1], now + ttl, ARGV[5])
  redis.call('PEXPIRE', KEYS[1], ttl)
  return { hits + 1, untilOldestExpires(), 0, 0 }
end

redis.call('ZADD', KEYS[1], now + ttl, ARGV[5])
hits = hits + 1
if hits > limit then
  redis.call('SET', KEYS[2], 1, 'PX', block)
  redis.call('DEL', KEYS[1])
  return { hits, block, 1, block }
end
redis.call('PEXPIRE', KEYS[1], ttl)
return { hits, untilOldestExpires(), 0, 0 }
`;

const toSeconds = (ms: number) => Math.ceil(ms / 1000);

/** Rate-limit counters in the app's Redis, shared by every instance. */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private failing = false;
  private connectedOnce: boolean;

  constructor(private readonly redis: Redis) {
    this.connectedOnce = redis.status === 'ready';
    redis.on('ready', () => {
      this.connectedOnce = true;
    });
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): Promise<ThrottlerStorageRecord> {
    try {
      // Once connected, a lost connection fails open at once: queued commands
      // would wait for each reconnect attempt, once per throttler.
      if (this.connectedOnce && this.redis.status !== 'ready') {
        throw new Error(`Redis connection is ${this.redis.status}`);
      }
      const [totalHits, expireMs, isBlocked, blockMs] = (await this.redis.eval(
        INCREMENT_SCRIPT,
        2,
        `throttle:${key}`,
        `throttle:${key}:block`,
        Date.now(),
        ttl,
        limit,
        blockDuration,
        randomUUID(),
      )) as [number, number, number, number];

      if (this.failing) {
        this.failing = false;
        this.logger.log('Redis is back: rate limiting resumed');
      }
      return {
        totalHits,
        timeToExpire: toSeconds(expireMs),
        isBlocked: isBlocked === 1,
        timeToBlockExpire: toSeconds(blockMs),
      };
    } catch (error) {
      // Fail open: a Redis outage must not take every route down with it.
      if (!this.failing) {
        this.failing = true;
        this.logger.error(
          'Redis unavailable: requests are not rate limited until it is back',
          error,
        );
      }
      return {
        totalHits: 0,
        timeToExpire: toSeconds(ttl),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }
}
