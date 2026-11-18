import { Public } from '@nestjs/authentication';
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { sql } from 'drizzle-orm';
import { Redis } from 'ioredis';
import { DatabaseService } from '../../infra/database/database.service.js';

/** Probes for the orchestrator, which polls them often and without credentials. */
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    private readonly database: DatabaseService,
    private readonly redis: Redis,
  ) {}

  /** Liveness: the process answers. No dependencies, so an outage never restarts it. */
  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  /** Readiness: 503 when Postgres is down, so traffic goes to other instances. */
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () =>
        this.indicator
          .check('database')
          .attempt(async () => {
            await this.database.db.execute(sql`select 1`);
          })
          .withTimeout('1s'),
      // Without Redis, rate limiting fails open and cache and queues degrade:
      // reported, but the instance keeps serving.
      () =>
        this.indicator
          .check('redis')
          .attempt(async () => {
            await this.redis.ping();
          })
          .withTimeout('1s')
          .degradedOnFailure(),
    ]);
  }
}
