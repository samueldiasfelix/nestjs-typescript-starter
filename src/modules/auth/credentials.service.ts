import { PasswordHasher } from '@nestjs/authentication';
import { ConflictException, Injectable } from '@nestjs/common';
import type { User } from '../users/user.entity.js';
import { UserService } from '../users/user.service.js';

/** Email and password accounts. */
@Injectable()
export class CredentialsService {
  constructor(
    private readonly users: UserService,
    private readonly hasher: PasswordHasher,
  ) {}

  async register(email: string, password: string): Promise<User> {
    const user = await this.users.create(
      email,
      await this.hasher.hash(password),
    );
    if (!user) {
      throw new ConflictException('Email already registered');
    }
    return user;
  }

  /** The user, or `null`: as slow for an unknown email as for a wrong password. */
  async verify(email: string, password: string): Promise<User | null> {
    const found = await this.users.findCredentials(email);
    const valid = await this.hasher.verify(password, found?.passwordHash);
    if (!valid || !found?.passwordHash) {
      return null;
    }
    // Upgrades hashes made with older parameters while the password is at hand.
    if (this.hasher.needsRehash(found.passwordHash)) {
      await this.users.updatePasswordHash(
        found.user.id,
        await this.hasher.hash(password),
      );
    }
    return found.user;
  }
}
