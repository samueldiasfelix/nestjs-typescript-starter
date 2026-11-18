import { randomUUID } from 'node:crypto';
import {
  BullModule,
  getQueueToken,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import { Test } from '@nestjs/testing';
import { Job, Queue } from 'bullmq';
import { AppModule } from './../src/app.module.js';

// Needs a running Redis: `docker compose up -d`.
const QUEUE = `test-${randomUUID()}`;

@Processor(QUEUE)
class TestProcessor extends WorkerHost {
  private resolveProcessed!: (data: unknown) => void;
  readonly processed = new Promise<unknown>((resolve) => {
    this.resolveProcessed = resolve;
  });

  async process(job: Job) {
    this.resolveProcessed(job.data);
    return { ok: true };
  }
}

describe('Queues (e2e)', () => {
  let app: NestNodeApplication;
  let queue: Queue;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule, BullModule.registerQueue({ name: QUEUE })],
      providers: [TestProcessor],
    }).compile();

    app = moduleFixture.createNestApplication<NestNodeApplication>(
      new NodeAdapter(),
    );
    await app.init();
    queue = app.get(getQueueToken(QUEUE));
  });

  afterEach(async () => {
    await queue.obliterate({ force: true });
    await app.close();
  });

  it('processes an added job', async () => {
    await queue.add('ping', { id: 1 });

    const data = await Promise.race([
      app.get(TestProcessor).processed,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Job not processed in 5s')), 5000),
      ),
    ]);

    expect(data).toEqual({ id: 1 });
  });
});
