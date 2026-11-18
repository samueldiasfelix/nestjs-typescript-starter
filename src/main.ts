import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { AppModule } from './app.module.js';
import { Env } from './env.schema.js';

async function bootstrap() {
  const app = await NestFactory.create<NestNodeApplication>(
    AppModule,
    new NodeAdapter(),
    { bufferLogs: true },
  );

  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.useLogger(
    new ConsoleLogger({
      json: config.get('NODE_ENV', { infer: true }) === 'production',
    }),
  );
  await app.listen(config.get('PORT', { infer: true }));
}

await bootstrap();
