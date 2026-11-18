import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../infra/database/database.service.js';
import { type User, users } from './user.entity.js';

const userColumns = {
  id: users.id,
  email: users.email,
  createdAt: users.createdAt,
};

@Injectable()
export class UserService {
  constructor(private readonly database: DatabaseService) {}

  async findById(id: string): Promise<User | null> {
    const [user] = await this.database.db
      .select(userColumns)
      .from(users)
      .where(eq(users.id, id));
    return user ?? null;
  }

  /** The user with their password hash, for checking a sign-in. */
  async findCredentials(
    email: string,
  ): Promise<{ user: User; passwordHash: string | null } | null> {
    const [row] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    if (!row) {
      return null;
    }
    const { passwordHash, ...user } = row;
    return { user, passwordHash };
  }

  /** The new user, or `null` when the email is taken. */
  async create(email: string, passwordHash: string): Promise<User | null> {
    const [user] = await this.database.db
      .insert(users)
      .values({ email, passwordHash })
      .onConflictDoNothing({ target: users.email })
      .returning(userColumns);
    return user ?? null;
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.database.db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, id));
  }
}
