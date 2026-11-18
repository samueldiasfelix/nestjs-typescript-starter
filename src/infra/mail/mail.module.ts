import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileMailTransport, MailModule, SmtpTransport } from '@nestjs/mail';
import { Env } from '../../config/env.schema.js';

/**
 * Mail transport chosen by `MAIL_TRANSPORT`: SMTP in production, `.eml` files
 * in `var/mail` in development. Global: inject `Mailer`.
 */
@Module({
  imports: [
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
  ],
})
export class AppMailModule {}
