import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  NestNodeApplication,
  NodeAdapter,
  type NodeRequest,
  type NodeResponse,
} from '@nestjs/platform-node';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { z } from 'zod';
import { AppModule } from './app.module.js';
import { envSchema } from './config/env.schema.js';

async function bootstrap() {
  // The adapter needs TRUST_PROXY before Nest (and ConfigService) exists, so
  // load and validate the env here too. ConfigModule validates the same schema.
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
    process.exit(1);
  }
  const env = parsed.data;

  const app = await NestFactory.create<NestNodeApplication>(
    AppModule,
    new NodeAdapter({ trustProxy: env.TRUST_PROXY }),
    { bufferLogs: true },
  );

  // Helmet 8's default headers, built into Nest.
  app.useSecurityHeaders();
  // Off unless origins are listed: same-origin only.
  if (env.CORS_ORIGINS.length > 0) {
    app.enableCors({
      origin: env.CORS_ORIGINS,
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    });
  }
  // Rejects cross-site, state-changing browser requests (Sec-Fetch-Site/Origin),
  // except from the origins CORS allows. GET, HEAD and OPTIONS are never checked.
  app.enableCsrfProtection({ trustedOrigins: env.CORS_ORIGINS });

  app.useLogger(new ConsoleLogger({ json: env.NODE_ENV === 'production' }));

  // API reference (Scalar) at /docs, OpenAPI definition at /docs-json. Not in production.
  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('NestJS TypeScript Starter API')
      .setDescription(
        'REST API of the NestJS TypeScript starter. Rate limited per client IP; errors follow the Nest HTTP exception format.',
      )
      .setVersion('1.0')
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, documentFactory, { ui: false });
    app.use('/docs', (req: NodeRequest, res: NodeResponse) => {
      // Scalar's scripts (CDN and inline) need a nonce under the app's CSP.
      const nonce = randomBytes(16).toString('base64');
      const csp = String(res.getHeader('Content-Security-Policy'));
      res.setHeader(
        'Content-Security-Policy',
        csp.replace('script-src ', `script-src 'nonce-${nonce}' `),
      );
      apiReference({ url: '/docs-json', nonce })(req, res);
    });
  }

  await app.listen(env.PORT);
}

await bootstrap();
