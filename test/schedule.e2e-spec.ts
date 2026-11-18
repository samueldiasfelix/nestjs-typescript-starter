import { Injectable } from '@nestjs/common';
import { NestNodeApplication, NodeAdapter } from '@nestjs/platform-node';
import {
  Cron,
  CronExpression,
  Interval,
  SchedulerRegistry,
} from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import { AppModule } from './../src/app.module.js';

@Injectable()
class TestJobs {
  ticks = 0;

  @Interval('test-tick', 20)
  tick() {
    this.ticks++;
  }

  @Cron(CronExpression.EVERY_HOUR, { name: 'test-cron' })
  hourly() {}
}

describe('Scheduler (e2e)', () => {
  let app: NestNodeApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
      providers: [TestJobs],
    }).compile();

    app = moduleFixture.createNestApplication<NestNodeApplication>(
      new NodeAdapter(),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('runs interval jobs', async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(app.get(TestJobs).ticks).toBeGreaterThan(0);
  });

  it('registers named jobs in SchedulerRegistry', () => {
    const registry = app.get(SchedulerRegistry);

    expect(registry.getInterval('test-tick')).toBeDefined();
    expect(
      registry.getCronJob('test-cron').nextDate().toMillis(),
    ).toBeGreaterThan(Date.now());
  });
});
