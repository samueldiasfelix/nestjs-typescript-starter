import { lockStoreContract } from '@nestjs/locks/testing';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { DrizzleLockStore } from '../../src/infra/locks/drizzle-lock.store.js';

// Needs a running Postgres: `docker compose up -d`.
describe('DrizzleLockStore (e2e)', () => {
  let app: NestNodeApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestNodeApplication>(
      new NodeAdapter(),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // The expiry cases wait in real time, on the database's clock.
  for (const { name, run } of lockStoreContract(
    () => app.get(DrizzleLockStore),
    { concurrent: true },
  )) {
    it(name, run, 15_000);
  }
});
