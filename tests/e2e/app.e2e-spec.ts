import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: NestNodeApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestNodeApplication>(
      new NodeAdapter(),
    );
    await app.init();
  });

  it('/ (GET)', async () => {
    const res = await app.inject({ method: 'GET', url: '/' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('Hello World!');
  });

  afterEach(async () => {
    await app.close();
  });
});
