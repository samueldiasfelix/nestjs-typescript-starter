import { AuthenticationModule } from '@nestjs/authentication';
import { AuthorizationModule } from '@nestjs/authorization';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../config/env.schema.js';
import { UserModule } from '../users/user.module.js';
import { AuthController } from './auth.controller.js';
import { CredentialsService } from './credentials.service.js';
import { DrizzleSessionStore } from './drizzle-session.store.js';
import { SessionAuth } from './session.auth.js';

/**
 * Sign-in with a session cookie, and policies. Both guards are global: every
 * route needs a signed-in user and a `@Can()`, unless it is `@Public()`
 * (anyone) or `@Can.Anyone()` (any signed-in user).
 */
@Module({
  imports: [
    // Before AuthorizationModule, whose guard reads the user this one sets.
    AuthenticationModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        session: {
          absoluteTtl: '14d',
          idleTtl: '3d',
          // The web apps on other origins, as for CORS and CSRF.
          trustedOrigins: config.get('CORS_ORIGINS', { infer: true }),
        },
      }),
    }),
    AuthorizationModule.forRoot(),
    UserModule,
  ],
  controllers: [AuthController],
  providers: [DrizzleSessionStore, SessionAuth, CredentialsService],
})
export class AuthModule {}
