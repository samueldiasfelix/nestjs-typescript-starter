import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalDisk, S3Disk, StorageModule } from '@nestjs/storage';
import { Env } from '../../config/env.schema.js';

/**
 * One private disk, `files`, chosen by `STORAGE_DRIVER`: any S3-compatible
 * store in production, `var/storage` in development. Inject `StorageDisk`.
 */
@Module({
  imports: [
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
})
export class AppStorageModule {}
