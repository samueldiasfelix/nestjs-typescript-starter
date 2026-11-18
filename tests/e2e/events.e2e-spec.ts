import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';

@Injectable()
class TestListener {
  readonly received: unknown[] = [];
  readonly receivedAsync: unknown[] = [];

  @OnEvent('test.ping')
  onPing(payload: unknown) {
    this.received.push(payload);
  }

  // No `async: true`: that option defers the listener, so emitAsync wouldn't
  // wait for it. A listener returning a promise is awaited by emitAsync.
  @OnEvent('test.ping-async')
  async onPingAsync(payload: unknown) {
    await Promise.resolve();
    this.receivedAsync.push(payload);
  }
}

describe('Event emitter (e2e)', () => {
  let app: NestNodeApplication;
  let emitter: EventEmitter2;
  let listener: TestListener;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
      providers: [TestListener],
    }).compile();

    app = moduleFixture.createNestApplication<NestNodeApplication>(
      new NodeAdapter(),
    );
    await app.init();
    emitter = app.get(EventEmitter2);
    listener = app.get(TestListener);
  });

  afterEach(async () => {
    await app.close();
  });

  it('delivers an emitted event to its listener', () => {
    emitter.emit('test.ping', { id: 1 });

    expect(listener.received).toEqual([{ id: 1 }]);
  });

  it('awaits async listeners with emitAsync', async () => {
    await emitter.emitAsync('test.ping-async', { id: 2 });

    expect(listener.receivedAsync).toEqual([{ id: 2 }]);
  });
});
