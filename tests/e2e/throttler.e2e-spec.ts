import { randomInt } from 'node:crypto';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { getOptionsToken, seconds } from '@nestjs/throttler';
import { AppModule } from '../../src/app.module.js';
import { RedisThrottlerStorage } from '../../src/infra/throttler/redis-throttler.storage.js';

// Needs a running Redis: `docker compose up -d`.
const ip = () => `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;

describe('Rate limiting (e2e)', () => {
  let app: NestNodeApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      // AppThrottlerModule skips throttling in tests: turn it on, with a small limit.
      .overrideProvider(getOptionsToken())
      .useFactory({
        inject: [RedisThrottlerStorage],
        factory: (storage: RedisThrottlerStorage) => ({
          throttlers: [{ ttl: seconds(60), limit: 2 }],
          storage,
        }),
      })
      .compile();

    // Behind a trusted proxy, the client is the X-Forwarded-For address.
    app = moduleFixture.createNestApplication<NestNodeApplication>(
      new NodeAdapter({ trustProxy: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const get = (clientIp: string) =>
    app.inject({
      method: 'GET',
      url: '/',
      headers: { 'x-forwarded-for': clientIp },
    });

  it('blocks a client over the limit with 429', async () => {
    const client = ip();

    const first = await get(client);
    const second = await get(client);
    const third = await get(client);

    expect(first.statusCode).toBe(200);
    expect(first.headers['x-ratelimit-limit']).toBe('2');
    expect(first.headers['x-ratelimit-remaining']).toBe('1');
    expect(second.statusCode).toBe(200);
    expect(second.headers['x-ratelimit-remaining']).toBe('0');
    expect(third.statusCode).toBe(429);
    expect(Number(third.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('counts each client separately', async () => {
    const blocked = ip();
    await get(blocked);
    await get(blocked);

    expect((await get(blocked)).statusCode).toBe(429);
    expect((await get(ip())).statusCode).toBe(200);
  });
});
