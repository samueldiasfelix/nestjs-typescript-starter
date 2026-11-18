import { Controller, Post } from '@nestjs/common';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';

const TRUSTED = 'https://app.example.com';
const EVIL = 'https://evil.example.com';

@Controller()
class EchoTestController {
  @Post('echo')
  echo() {
    return { ok: true };
  }
}

describe('Security (e2e)', () => {
  let app: NestNodeApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [EchoTestController],
    }).compile();

    app = moduleFixture.createNestApplication<NestNodeApplication>(
      new NodeAdapter(),
    );
    // Same setup as src/main.ts, with one trusted origin.
    app.useSecurityHeaders();
    app.enableCors({
      origin: [TRUSTED],
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    });
    app.enableCsrfProtection({ trustedOrigins: [TRUSTED] });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('security headers', () => {
    it('sets the default headers', async () => {
      const res = await app.inject({ method: 'GET', url: '/' });

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-security-policy']).toBeTruthy();
    });
  });

  describe('CORS', () => {
    const preflight = (origin: string) =>
      app.inject({
        method: 'OPTIONS',
        url: '/echo',
        headers: {
          origin,
          'access-control-request-method': 'POST',
        },
      });

    it('allows a listed origin, with credentials', async () => {
      const res = await preflight(TRUSTED);

      expect(res.headers['access-control-allow-origin']).toBe(TRUSTED);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('does not allow an unlisted origin', async () => {
      const res = await preflight(EVIL);

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('CSRF', () => {
    const post = (headers: Record<string, string>) =>
      app.inject({ method: 'POST', url: '/echo', headers });

    it('rejects a cross-site POST from an untrusted origin', async () => {
      const res = await post({ 'sec-fetch-site': 'cross-site', origin: EVIL });

      expect(res.statusCode).toBe(403);
    });

    it('allows a cross-site POST from a trusted origin', async () => {
      const res = await post({
        'sec-fetch-site': 'cross-site',
        origin: TRUSTED,
      });

      expect(res.statusCode).toBe(201);
    });

    it('allows a same-origin POST', async () => {
      const res = await post({ 'sec-fetch-site': 'same-origin' });

      expect(res.statusCode).toBe(201);
    });

    it('allows a POST from a non-browser client', async () => {
      const res = await post({});

      expect(res.statusCode).toBe(201);
    });

    it('never checks GET', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/',
        headers: { 'sec-fetch-site': 'cross-site', origin: EVIL },
      });

      expect(res.statusCode).toBe(200);
    });
  });
});
