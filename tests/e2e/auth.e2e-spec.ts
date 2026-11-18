import { randomUUID } from 'node:crypto';
import { authenticationStoreContract } from '@nestjs/authentication/testing';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { DrizzleSessionStore } from '../../src/modules/auth/drizzle-session.store.js';

// Needs a running Postgres: `docker compose up -d`.
describe('Authentication (e2e)', () => {
  let app: NestNodeApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestNodeApplication>(
      new NodeAdapter(),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (url: string, payload?: object, cookie?: string) =>
    app.inject({
      method: 'POST',
      url,
      payload,
      headers: cookie ? { cookie } : {},
    });
  const me = (cookie?: string) =>
    app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: cookie ? { cookie } : {},
    });
  /** The `name=value` part of the session cookie a response sets. */
  const sessionCookie = (res: { headers: Record<string, unknown> }) => {
    const header = [res.headers['set-cookie']].flat().map(String);
    return header.find((c) => c.startsWith('__Host-sid='))?.split(';')[0];
  };

  const password = 'correct horse battery staple';
  const newEmail = () => `user-${randomUUID()}@example.com`;

  it('signs up, reads the user, and signs out', async () => {
    const email = newEmail();

    const signUp = await post('/auth/sign-up', {
      email: ` ${email.toUpperCase()} `,
      password,
    });
    expect(signUp.statusCode).toBe(201);
    expect(signUp.json()).toMatchObject({ email });
    expect(signUp.json()).not.toHaveProperty('passwordHash');
    const cookie = sessionCookie(signUp);
    expect(cookie).toBeDefined();

    const current = await me(cookie);
    expect(current.statusCode).toBe(200);
    expect(current.json()).toEqual(signUp.json());

    expect((await post('/auth/sign-out', undefined, cookie)).statusCode).toBe(
      204,
    );
    expect((await me(cookie)).statusCode).toBe(401);
  });

  it('signs in with the right password only', async () => {
    const email = newEmail();
    await post('/auth/sign-up', { email, password });

    const wrong = await post('/auth/sign-in', { email, password: 'nope' });
    expect(wrong.statusCode).toBe(401);
    expect(sessionCookie(wrong)).toBeUndefined();

    const unknown = await post('/auth/sign-in', {
      email: newEmail(),
      password,
    });
    expect(unknown.statusCode).toBe(401);

    const right = await post('/auth/sign-in', { email, password });
    expect(right.statusCode).toBe(200);
    expect((await me(sessionCookie(right))).statusCode).toBe(200);
  });

  it('refuses a taken email and an invalid body', async () => {
    const email = newEmail();
    await post('/auth/sign-up', { email, password });

    expect((await post('/auth/sign-up', { email, password })).statusCode).toBe(
      409,
    );

    const invalid = await post('/auth/sign-up', {
      email: 'not-an-email',
      password: 'short',
    });
    expect(invalid.statusCode).toBe(400);
    expect(Object.keys(invalid.json().message)).toEqual(['email', 'password']);
  });

  it('signs out every session of the user', async () => {
    const email = newEmail();
    const first = sessionCookie(
      await post('/auth/sign-up', { email, password }),
    );
    const second = sessionCookie(
      await post('/auth/sign-in', { email, password }),
    );

    const res = await post('/auth/sign-out-everywhere', undefined, second);

    expect(res.statusCode).toBe(204);
    expect((await me(first)).statusCode).toBe(401);
    expect((await me(second)).statusCode).toBe(401);
  });

  it('protects routes by default', async () => {
    expect((await me()).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/' })).statusCode).toBe(
      200,
    );
  });

  describe('DrizzleSessionStore', () => {
    for (const { name, run } of authenticationStoreContract(
      () => ({ sessions: app.get(DrizzleSessionStore) }),
      { contracts: ['sessions'], concurrent: true },
    )) {
      it(name, run);
    }
  });
});
