import { z } from 'zod';

/** A serialized origin, such as `https://app.example.com`: no path, no trailing slash. */
const origin = z.url().refine((value) => new URL(value).origin === value, {
  message: 'Must be an origin, like https://app.example.com (no path)',
});

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    // Comma-separated browser origins allowed to call the API (CORS) and to send
    // state-changing requests (CSRF). Empty: same-origin only.
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
      )
      .pipe(z.array(origin)),
    // Defaults to the Postgres in compose.yaml.
    DATABASE_URL: z.url().default('postgres://app:app@localhost:5432/app'),
    REDIS_HOST: z.string().min(1).default('localhost'),
    REDIS_PORT: z.coerce.number().int().positive().default(6379),
    REDIS_PASSWORD: z.string().optional(),
    MAIL_TRANSPORT: z.enum(['file', 'smtp']).default('file'),
    MAIL_FROM: z.string().min(1).default('App <no-reply@example.com>'),
    MAIL_SMTP_URL: z.url().optional(),
    STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
    STORAGE_LOCAL_ROOT: z.string().min(1).default('var/storage'),
    STORAGE_S3_BUCKET: z.string().min(1).optional(),
    // Defaults to AWS_REGION, then AWS_DEFAULT_REGION, then us-east-1 ("auto" for R2).
    STORAGE_S3_REGION: z.string().min(1).optional(),
    // For S3-compatible stores (R2, MinIO, Spaces). Defaults to AWS.
    STORAGE_S3_ENDPOINT: z.url().optional(),
    // MinIO and most self-hosted stores need path-style URLs.
    STORAGE_S3_FORCE_PATH_STYLE: z.stringbool().default(false),
  })
  .refine((env) => env.MAIL_TRANSPORT !== 'smtp' || env.MAIL_SMTP_URL, {
    path: ['MAIL_SMTP_URL'],
    message: 'Required when MAIL_TRANSPORT is "smtp"',
  })
  .refine((env) => env.STORAGE_DRIVER !== 's3' || env.STORAGE_S3_BUCKET, {
    path: ['STORAGE_S3_BUCKET'],
    message: 'Required when STORAGE_DRIVER is "s3"',
  });

export type Env = z.infer<typeof envSchema>;
