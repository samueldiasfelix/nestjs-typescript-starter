import {
  AuthenticationStorage,
  type SessionRecord,
  type SessionStore,
} from '@nestjs/authentication';
import { Injectable } from '@nestjs/common';
import { and, eq, lt } from 'drizzle-orm';
import { DatabaseService } from '../../infra/database/database.service.js';
import { sessions } from './session.entity.js';

type SessionRow = typeof sessions.$inferSelect;

// Optional fields come back absent, never `null`.
const toRecord = ({ mfa, metadata, ...row }: SessionRow): SessionRecord => ({
  ...row,
  ...(mfa ? { mfa } : {}),
  ...(metadata ? { metadata } : {}),
});

/** `@nestjs/authentication` sessions in Postgres, so every instance shares them. */
@Injectable()
export class DrizzleSessionStore implements SessionStore {
  constructor(
    private readonly database: DatabaseService,
    storage: AuthenticationStorage,
  ) {
    storage.registerSource({ sessions: this });
  }

  async getSession(id: string): Promise<SessionRecord | undefined> {
    const [row] = await this.database.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id));
    return row && toRecord(row);
  }

  async createSession(record: SessionRecord): Promise<void> {
    // Keeps the table bounded: drops the sessions past their absolute expiry.
    await this.database.db
      .delete(sessions)
      .where(lt(sessions.expiresAt, record.createdAt));
    await this.database.db.insert(sessions).values({
      id: record.id,
      userId: record.userId,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      lastActiveAt: record.lastActiveAt,
      mfa: record.mfa ?? null,
      metadata: record.metadata ?? null,
    });
  }

  async touchSession(id: string, lastActiveAt: Date): Promise<void> {
    // One conditional write, so a touch never brings back a deleted session.
    await this.database.db
      .update(sessions)
      .set({ lastActiveAt })
      .where(and(eq(sessions.id, id), lt(sessions.lastActiveAt, lastActiveAt)));
  }

  async deleteSession(id: string): Promise<boolean> {
    const rows = await this.database.db
      .delete(sessions)
      .where(eq(sessions.id, id))
      .returning({ id: sessions.id });
    return rows.length > 0;
  }

  async listUserSessions(userId: string): Promise<SessionRecord[]> {
    const rows = await this.database.db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId));
    return rows.map(toRecord);
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.database.db.delete(sessions).where(eq(sessions.userId, userId));
  }
}
