import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard } from '@nestjs/throttler';
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
import { AppLocksModule } from './infra/locks/locks.module.js';
import { RedisModule } from './infra/redis/redis.module.js';
import { AppStorageModule } from './infra/storage/storage.module.js';
import { AppThrottlerModule } from './infra/throttler/throttler.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';

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
    RedisModule,
    AppCacheModule,
    QueueModule,
    AppHttpClientModule,
    AppMailModule,
    AppStorageModule,
    AppThrottlerModule,
    AppLocksModule,
    AuthModule,
    HealthModule,
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
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
