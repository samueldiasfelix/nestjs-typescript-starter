import { BullModule } from '@nestjs/bullmq';
import { Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HttpClientModule } from '@nestjs/http-client';
import { FileMailTransport, MailModule, SmtpTransport } from '@nestjs/mail';
import { ScheduleModule } from '@nestjs/schedule';
import { LocalDisk, S3Disk, StorageModule } from '@nestjs/storage';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { Env, envSchema } from './env.schema.js';
import { groupedValidationErrors } from './grouped-validation-errors.pipe.js';
import { HttpClientErrorFilter } from './http-client-error.filter.js';
import { StorageErrorFilter } from './storage-error.filter.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envSchema,
    }),
    DatabaseModule,
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
    MailModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        transport:
          config.get('MAIL_TRANSPORT', { infer: true }) === 'smtp'
            ? new SmtpTransport({
                url: config.get('MAIL_SMTP_URL', { infer: true }),
              })
            : new FileMailTransport({ directory: 'var/mail' }),
        from: config.get('MAIL_FROM', { infer: true }),
      }),
    }),
    StorageModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        disks: {
          files:
            config.get('STORAGE_DRIVER', { infer: true }) === 's3'
              ? new S3Disk({
                  // The env schema requires the bucket when the driver is s3.
                  bucket: config.getOrThrow('STORAGE_S3_BUCKET', {
                    infer: true,
                  }),
                  region: config.get('STORAGE_S3_REGION', { infer: true }),
                  endpoint: config.get('STORAGE_S3_ENDPOINT', { infer: true }),
                  forcePathStyle: config.get('STORAGE_S3_FORCE_PATH_STYLE', {
                    infer: true,
                  }),
                })
              : new LocalDisk({
                  root: config.get('STORAGE_LOCAL_ROOT', { infer: true }),
                }),
        },
      }),
    }),
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
