import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { z } from 'zod';
import { AppModule } from '../../src/app.module.js';
import { ROOT_KEY } from '../../src/common/validation/grouped-validation-errors.pipe.js';

const echoSchema = z.object({ name: z.string().min(1) });

@Controller()
class ValidationTestController {
  @Post('echo')
  echo(@Body({ schema: echoSchema }) body: z.infer<typeof echoSchema>) {
    return body;
  }

  @Get('items/:id')
  item(
    @Param('id', { schema: z.coerce.number().int().positive() }) id: number,
  ) {
    return { id, type: typeof id };
  }
}

describe('Global validation (e2e)', () => {
  let app: NestNodeApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ValidationTestController],
    }).compile();

    app = moduleFixture.createNestApplication<NestNodeApplication>(
      new NodeAdapter(),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('accepts a valid body and strips unknown keys', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/echo',
      payload: { name: 'Nest', extra: true },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ name: 'Nest' });
  });

  it('rejects an invalid body with 400 and grouped messages', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/echo',
      payload: { name: '' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      message: { name: [expect.any(String)] },
      error: 'Bad Request',
      statusCode: 400,
    });
  });

  it('groups several issues under their paths', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/echo',
      payload: {},
    });

    expect(res.statusCode).toBe(400);
    expect(Object.keys(res.json().message)).toEqual(['name']);
  });

  it('coerces a valid path param', async () => {
    const res = await app.inject({ method: 'GET', url: '/items/5' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: 5, type: 'number' });
  });

  it('rejects an invalid path param with 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/items/abc' });

    expect(res.statusCode).toBe(400);
    expect(res.json().message).toEqual({ [ROOT_KEY]: [expect.any(String)] });
  });
});
