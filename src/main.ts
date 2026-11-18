import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { AppModule } from './app.module.js';
import { Env } from './config/env.schema.js';

async function bootstrap() {
  const app = await NestFactory.create<NestNodeApplication>(
    AppModule,
    new NodeAdapter(),
    { bufferLogs: true },
  );

  const config = app.get<ConfigService<Env, true>>(ConfigService);
  const corsOrigins = config.get('CORS_ORIGINS', { infer: true });

  // Helmet 8's default headers, built into Nest.
  app.useSecurityHeaders();
  // Off unless origins are listed: same-origin only.
  if (corsOrigins.length > 0) {
    app.enableCors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    });
  }
  // Rejects cross-site, state-changing browser requests (Sec-Fetch-Site/Origin),
  // except from the origins CORS allows. GET, HEAD and OPTIONS are never checked.
  app.enableCsrfProtection({ trustedOrigins: corsOrigins });

  app.useLogger(
    new ConsoleLogger({
      json: config.get('NODE_ENV', { infer: true }) === 'production',
    }),
  );

  await app.listen(config.get('PORT', { infer: true }));
}

await bootstrap();
