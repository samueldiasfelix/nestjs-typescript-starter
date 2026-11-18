import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    REDIS_HOST: z.string().min(1).default('localhost'),
    REDIS_PORT: z.coerce.number().int().positive().default(6379),
    REDIS_PASSWORD: z.string().optional(),
    MAIL_TRANSPORT: z.enum(['file', 'smtp']).default('file'),
    MAIL_FROM: z.string().min(1).default('App <no-reply@example.com>'),
    MAIL_SMTP_URL: z.url().optional(),
  })
  .refine((env) => env.MAIL_TRANSPORT !== 'smtp' || env.MAIL_SMTP_URL, {
    path: ['MAIL_SMTP_URL'],
    message: 'Required when MAIL_TRANSPORT is "smtp"',
  });

export type Env = z.infer<typeof envSchema>;
