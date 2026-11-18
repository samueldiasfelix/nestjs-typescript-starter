import { Public } from '@nestjs/authentication';
import { Controller, Get } from '@nestjs/common';
import {
  HTTP_CLIENT_MODULE_OPTIONS,
  HttpClient,
  HttpClientModule,
} from '@nestjs/http-client';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';

@Public()
@Controller()
class ProxyController {
  constructor(private readonly client: HttpClient) {}

  @Get('proxy')
  async proxy() {
    const res = await this.client.get('/thing', { retry: false });
    return res.data;
  }
}

describe('HTTP client (e2e)', () => {
  let app: NestNodeApplication;
  const fetch = vi.fn<typeof globalThis.fetch>();

  const respond = (status: number, body: unknown) =>
    fetch.mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

  beforeEach(async () => {
    fetch.mockReset();
    const moduleFixture = await Test.createTestingModule({
      imports: [
        AppModule,
        HttpClientModule.register({ baseUrl: 'https://upstream.test' }),
      ],
      controllers: [ProxyController],
    })
      .overrideProvider(HTTP_CLIENT_MODULE_OPTIONS)
      .useValue({ timeout: '10s', fetch })
      .compile();

    app = moduleFixture.createNestApplication<NestNodeApplication>(
      new NodeAdapter(),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the upstream data', async () => {
    respond(200, { ok: true });

    const res = await app.inject({ method: 'GET', url: '/proxy' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      'https://upstream.test/thing',
    );
  });

  it('maps an upstream 5xx to 502 Bad Gateway', async () => {
    respond(503, { error: 'down' });

    const res = await app.inject({ method: 'GET', url: '/proxy' });

    expect(res.statusCode).toBe(502);
  });
});
