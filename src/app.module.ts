import { BullModule } from '@nestjs/bullmq';
import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HttpClientModule } from '@nestjs/http-client';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { Env, envSchema } from './env.schema.js';
import { groupedValidationErrors } from './grouped-validation-errors.js';
import { HttpClientErrorFilter } from './http-client-error.filter.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envSchema,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        connection: {
          host: config.get('REDIS_HOST', { infer: true }),
          port: config.get('REDIS_PORT', { infer: true }),
          password: config.get('REDIS_PASSWORD', { infer: true }),
        },
      }),
    }),
    HttpClientModule.forRoot({ timeout: '10s' }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new StandardSchemaValidationPipe({
        exceptionFactory: groupedValidationErrors,
      }),
    },
    { provide: APP_FILTER, useClass: HttpClientErrorFilter },
  ],
})
export class AppModule {}
