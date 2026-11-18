import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';

describe('OpenAPI docs (e2e)', () => {
  let app: NestNodeApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestNodeApplication>(
      new NodeAdapter(),
    );
    // Same setup as src/main.ts.
    app.useSecurityHeaders();
    const config = new DocumentBuilder()
      .setTitle('API')
      .setVersion('1.0')
      .build();
    SwaggerModule.setup('docs', app, () =>
      SwaggerModule.createDocument(app, config),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('serves the OpenAPI definition with the app routes', async () => {
    const res = await app.inject({ method: 'GET', url: '/docs-json' });

    expect(res.statusCode).toBe(200);
    const document = res.json();
    expect(document.openapi).toMatch(/^3\./);
    expect(document.paths['/']).toHaveProperty('get');
  });

  it('serves the YAML definition', async () => {
    const res = await app.inject({ method: 'GET', url: '/docs-yaml' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('openapi:');
  });

  it('serves the UI with no inline scripts, so the CSP allows it', async () => {
    const res = await app.inject({ method: 'GET', url: '/docs' });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.headers['content-security-policy']).toContain(
      "script-src 'self'",
    );
    // Every <script> loads a same-origin file; none has an inline body.
    for (const [, attrs, body] of res.body.matchAll(
      /<script([^>]*)>([\s\S]*?)<\/script>/g,
    )) {
      expect(attrs).toMatch(/src="\.?\/?[^/:]/);
      expect(body.trim()).toBe('');
    }

    const init = await app.inject({
      method: 'GET',
      url: '/docs/swagger-ui-init.js',
    });
    expect(init.statusCode).toBe(200);
  });
});
