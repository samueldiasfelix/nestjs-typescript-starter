import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HttpClientErrorFilter } from './common/filters/http-client-error.filter.js';
import { StorageErrorFilter } from './common/filters/storage-error.filter.js';
import { groupedValidationErrors } from './common/pipes/grouped-validation-errors.pipe.js';
import { envSchema } from './config/env.schema.js';
import { AppCacheModule } from './infra/cache/cache.module.js';
import { DatabaseModule } from './infra/database/database.module.js';
import { AppHttpClientModule } from './infra/http-client/http-client.module.js';
import { AppMailModule } from './infra/mail/mail.module.js';
import { QueueModule } from './infra/queue/queue.module.js';
import { AppStorageModule } from './infra/storage/storage.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envSchema,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AppCacheModule,
    QueueModule,
    AppHttpClientModule,
    AppMailModule,
    AppStorageModule,
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
    { provide: APP_FILTER, useClass: StorageErrorFilter },
  ],
})
export class AppModule {}
