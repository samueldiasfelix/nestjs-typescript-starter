import {
  AuthenticationRegistry,
  SessionCookieProvider,
  type SessionRecord,
} from '@nestjs/authentication';
import { Injectable } from '@nestjs/common';
import type { User } from '../users/user.entity.js';
import { UserService } from '../users/user.service.js';

declare module '@nestjs/authentication' {
  interface AuthenticationTypes {
    user: User;
  }
}

/** Signs requests in from the session cookie (`__Host-sid`). */
@Injectable()
export class SessionAuth extends SessionCookieProvider<User> {
  constructor(
    private readonly users: UserService,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }

  /** A deleted user ends the session. */
  protected validate(session: SessionRecord) {
    return this.users.findById(session.userId);
  }
}
