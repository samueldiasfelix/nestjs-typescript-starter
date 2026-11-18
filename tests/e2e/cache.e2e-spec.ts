import { randomUUID } from 'node:crypto';
import { CACHE_MANAGER, CacheInterceptor } from '@nestjs/cache-manager';
import { Public } from '@nestjs/authentication';
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import type { Cache } from 'cache-manager';
import { AppModule } from '../../src/app.module.js';

// Needs a running Redis: `docker compose up -d`.
const ROUTE = `/cached-${randomUUID()}`;

@Public()
@Controller()
@UseInterceptors(CacheInterceptor)
class CachedTestController {
  calls = 0;

  @Get(ROUTE)
  counter() {
    return { calls: ++this.calls };
  }
}

describe('Cache (e2e)', () => {
  let app: NestNodeApplication;
  let cache: Cache;
  const key = `test:${randomUUID()}`;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [CachedTestController],
    }).compile();

    app = moduleFixture.createNestApplication<NestNodeApplication>(
      new NodeAdapter(),
    );
    await app.init();
    cache = app.get(CACHE_MANAGER);
  });

  afterEach(async () => {
    await cache.del(key);
    await cache.del(ROUTE);
    await app.close();
  });

  it('sets, gets and deletes a value', async () => {
    await cache.set(key, { id: 1 });

    expect(await cache.get(key)).toEqual({ id: 1 });

    await cache.del(key);

    expect(await cache.get(key)).toBeUndefined();
  });

  it('expires a value after its ttl', async () => {
    await cache.set(key, 'short-lived', 50);
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(await cache.get(key)).toBeUndefined();
  });

  it('serves a repeated GET from the cache', async () => {
    const first = await app.inject({ method: 'GET', url: ROUTE });
    // CacheInterceptor writes to the cache after responding, without awaiting it.
    await vi.waitFor(async () => expect(await cache.get(ROUTE)).toBeDefined());
    const second = await app.inject({ method: 'GET', url: ROUTE });

    expect(first.json()).toEqual({ calls: 1 });
    expect(second.json()).toEqual({ calls: 1 });
  });
});
