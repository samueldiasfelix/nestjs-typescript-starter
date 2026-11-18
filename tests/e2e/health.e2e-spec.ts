import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';

// Needs a running Postgres and Redis: `docker compose up -d`.
describe('Health (e2e)', () => {
  let app: NestNodeApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestNodeApplication>(
      new NodeAdapter(),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('answers liveness without credentials', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/live' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
  });

  it('reports Postgres and Redis on readiness', async () => {
    const res = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: 'ok' });
    // Only the status and timing, never the query result.
    expect(Object.keys(res.json().info.database).sort()).toEqual([
      'responseTime',
      'status',
    ]);
    expect(res.json().info.redis.status).toBe('up');
  });
});
