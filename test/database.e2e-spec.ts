import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { sql } from 'drizzle-orm';
import { AppModule } from './../src/app.module.js';
import { DatabaseService } from './../src/database/database.service.js';

// Needs a running Postgres: `docker compose up -d`.
describe('Database (e2e)', () => {
  let app: NestNodeApplication;
  let database: DatabaseService;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestNodeApplication>(
      new NodeAdapter(),
    );
    await app.init();
    database = app.get(DatabaseService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('runs a query', async () => {
    const result = await database.db.execute(sql`select 1 as ok`);

    expect(result.rows).toEqual([{ ok: 1 }]);
  });

  it('returns the value of a committed transaction', async () => {
    const value = await database.transaction(async (tx) => {
      const result = await tx.execute(sql`select 2 as n`);
      return result.rows[0]?.n;
    });

    expect(value).toBe(2);
  });

  it('rejects when the transaction callback throws', async () => {
    await expect(
      database.transaction(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });
});
