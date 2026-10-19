import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service.js';
import { createLogCapture, type LogCapture } from './support/log-capture.js';
import { TEST_ENV, testConfig } from './support/test-env.js';

const CLOSED_PORT_DB = 'mysql://root:test@127.0.0.1:1/core_test';

describe('Database (e2e)', () => {
  let app: NestExpressApplication | undefined;
  let capture: LogCapture;

  afterEach(async () => {
    if (app) {
      await app.close();
      app = undefined;
    }
  });

  async function createTestApp(
    databaseUrl: string,
  ): Promise<NestExpressApplication> {
    capture = createLogCapture();
    const config = testConfig({
      port: 0,
      logLevel: 'debug',
      database: { url: databaseUrl },
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule.register(config, capture.stream)],
    }).compile();

    const application =
      moduleFixture.createNestApplication<NestExpressApplication>({
        bufferLogs: true,
      });
    await application.init();
    return application;
  }

  it('AC-3: with MySQL reachable, GET /health/ready returns 200 with database ok', async () => {
    app = await createTestApp(TEST_ENV['DATABASE_URL']!);

    const res = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);

    expect(res.body).toEqual({
      status: 'ok',
      checks: {
        database: 'ok',
      },
    });
  });

  it('AC-3: with unreachable DATABASE_URL, app starts and GET /health/ready returns 503 with database error', async () => {
    app = await createTestApp(CLOSED_PORT_DB);

    await request(app.getHttpServer()).get('/health').expect(200);

    const res = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(503);

    expect(res.body).toEqual({
      status: 'error',
      checks: {
        database: 'error',
      },
    });
  });

  it('AC-4: after app.close(), connection pool is closed and Vitest finishes without open handles', async () => {
    app = await createTestApp(TEST_ENV['DATABASE_URL']!);

    const prisma = app.get(PrismaService);
    const reachable = await prisma.ping();
    expect(reachable).toBe(true);

    const disconnectSpy = vi.spyOn(prisma.client, '$disconnect');

    await app.close();
    app = undefined;

    expect(disconnectSpy).toHaveBeenCalled();
  });
});
