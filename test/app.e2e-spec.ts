import { spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';
import { Controller, Get } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { Public } from '../src/shared/infrastructure/auth/auth.decorators.js';
import { createLogCapture, type LogCapture } from './support/log-capture.js';
import { TEST_ENV, testConfig } from './support/test-env.js';

async function resetLoggerState(): Promise<void> {
  const url = new URL('./rootLogger.js', import.meta.resolve('nestjs-pino'));
  const { resetRootLogger } = (await import(url.href)) as {
    resetRootLogger: () => void;
  };
  resetRootLogger();
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close(() => reject(new Error('Invalid address')));
        return;
      }
      const port = addr.port;
      server.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
    server.on('error', reject);
  });
}

function startApp(env: Record<string, string>): ChildProcess {
  return spawn('node', ['dist/main.js'], {
    env: {
      ...process.env,
      ...TEST_ENV,
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function waitForHealth(
  port: number,
  timeoutMs = 5000,
): Promise<Response> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://localhost:${port}/health`);
      if (res.ok) {
        return res;
      }
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error(`Timed out waiting for health check on port ${port}`);
}

@Public()
@Controller('test-route')
class TestRouteController {
  @Get('ok')
  ok(): { status: string } {
    return { status: 'ok' };
  }

  @Get('fail')
  fail(): never {
    throw new Error('Boom');
  }
}

describe('Foundation (e2e)', () => {
  describe('In-process', () => {
    let app: NestExpressApplication;
    let capture: LogCapture;

    beforeEach(async () => {
      await resetLoggerState();
      capture = createLogCapture();

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          AppModule.register(
            testConfig({ port: 0, logLevel: 'debug' }),
            capture.stream,
          ),
        ],
        controllers: [TestRouteController],
      }).compile();

      app = moduleFixture.createNestApplication<NestExpressApplication>({
        bufferLogs: true,
      });
      app.useLogger(app.get(Logger));
      await app.init();
    });

    afterEach(async () => {
      if (app) {
        await app.close();
      }
      await resetLoggerState();
    });

    it('AC-12: GET /health returns 200 { status: "ok" }', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.body).toEqual({ status: 'ok' });
    });

    it('AC-13: GET /health/ready returns 200 { status: "ok", checks: {} }', async () => {
      const res = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(res.body).toEqual({
        status: 'ok',
        checks: {},
      });
    });

    it('AC-15: GET / returns 404 NOT_FOUND with standard ErrorBody', async () => {
      const res = await request(app.getHttpServer()).get('/').expect(404);

      expect(res.body).toEqual({
        code: 'NOT_FOUND',
        message: 'Resource not found',
        correlationId: expect.any(String),
      });
    });

    it('AC-4: echoes valid incoming x-correlation-id header and reflects in error body', async () => {
      const res = await request(app.getHttpServer())
        .get('/')
        .set('x-correlation-id', 'test-corr-id-123')
        .expect(404);

      expect(res.headers['x-correlation-id']).toBe('test-corr-id-123');
      expect(res.body).toEqual({
        code: 'NOT_FOUND',
        message: 'Resource not found',
        correlationId: 'test-corr-id-123',
      });
    });

    it('AC-4: generates UUID v4 when x-correlation-id is missing or invalid', async () => {
      const resMissing = await request(app.getHttpServer())
        .get('/health')
        .expect(200);
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(resMissing.headers['x-correlation-id']).toMatch(uuidRegex);

      const resInvalid = await request(app.getHttpServer())
        .get('/health')
        .set('x-correlation-id', 'invalid header with spaces')
        .expect(200);
      expect(resInvalid.headers['x-correlation-id']).toMatch(uuidRegex);
      expect(resInvalid.headers['x-correlation-id']).not.toBe(
        'invalid header with spaces',
      );
    });

    it('AC-3: logs contain ISO time, level label, service core-service, context, and msg', async () => {
      await request(app.getHttpServer()).get('/test-route/ok').expect(200);

      await vi.waitFor(() => {
        const lines = capture.lines();
        const reqLog = lines.find(
          (l) =>
            l.context === 'HTTP' &&
            (l.req as { url?: string } | undefined)?.url === '/test-route/ok',
        );
        expect(reqLog).toBeDefined();
        expect(reqLog?.service).toBe('core-service');
        expect(typeof reqLog?.time).toBe('string');
        expect(new Date(reqLog?.time as string).toISOString()).toBe(
          reqLog?.time,
        );
        expect(reqLog?.level).toBe('info');
        expect(reqLog?.msg).toBe('request completed');
      });
    });

    it('AC-5: request log level is debug for /health*, warn for 4xx, error for 5xx, info for others', async () => {
      await request(app.getHttpServer()).get('/health').expect(200);
      await request(app.getHttpServer()).get('/non-existent').expect(404);
      await request(app.getHttpServer()).get('/test-route/fail').expect(500);
      await request(app.getHttpServer()).get('/test-route/ok').expect(200);

      await vi.waitFor(() => {
        const lines = capture.lines();
        const healthLog = lines.find(
          (l) =>
            l.context === 'HTTP' &&
            (l.req as { url?: string } | undefined)?.url === '/health',
        );
        const notFoundLog = lines.find(
          (l) =>
            l.context === 'HTTP' &&
            (l.req as { url?: string } | undefined)?.url === '/non-existent',
        );
        const failLog = lines.find(
          (l) =>
            l.context === 'HTTP' &&
            (l.req as { url?: string } | undefined)?.url === '/test-route/fail',
        );
        const okLog = lines.find(
          (l) =>
            l.context === 'HTTP' &&
            (l.req as { url?: string } | undefined)?.url === '/test-route/ok',
        );

        expect(healthLog?.level).toBe('debug');
        expect(notFoundLog?.level).toBe('warn');
        expect(failLog?.level).toBe('error');
        expect(okLog?.level).toBe('info');
      });
    });

    it('AC-6: authorization and cookie headers are redacted in logs', async () => {
      await request(app.getHttpServer())
        .get('/test-route/ok')
        .set('authorization', 'Bearer secret-token-123')
        .set('cookie', 'session=super-secret-cookie')
        .expect(200);

      await vi.waitFor(() => {
        const lines = capture.lines();
        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines) {
          const lineStr = JSON.stringify(line);
          expect(lineStr).not.toContain('secret-token-123');
          expect(lineStr).not.toContain('super-secret-cookie');
        }
      });
    });

    it('AC-9: unhandled error returns 500 INTERNAL_ERROR without details and logs error', async () => {
      const res = await request(app.getHttpServer())
        .get('/test-route/fail')
        .expect(500);

      expect(res.body).toEqual({
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        correlationId: expect.any(String),
      });
      expect(res.body).not.toHaveProperty('details');
      expect(res.body).not.toHaveProperty('stack');
      expect(JSON.stringify(res.body)).not.toContain('Boom');

      await vi.waitFor(() => {
        const errorLog = capture
          .lines()
          .find((l) => l.msg === 'Unhandled exception');
        expect(errorLog).toBeDefined();
        expect(errorLog?.level).toBe('error');
      });
    });

    it('AC-10: NotFoundException returns 404 NOT_FOUND with ErrorBody', async () => {
      const res = await request(app.getHttpServer())
        .get('/non-existent-route-123')
        .expect(404);

      expect(res.body).toEqual({
        code: 'NOT_FOUND',
        message: 'Resource not found',
        correlationId: expect.any(String),
      });
    });
  });

  describe('Real process (dist/main.js)', () => {
    const spawnedProcesses: ChildProcess[] = [];

    afterEach(() => {
      for (const child of spawnedProcesses) {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill('SIGKILL');
        }
      }
      spawnedProcesses.length = 0;
    });

    it('AC-1: with PORT=<libre>, responds 200 on /health in < 5s', async () => {
      const port = await freePort();
      const child = startApp({ PORT: String(port), LOG_LEVEL: 'error' });
      spawnedProcesses.push(child);

      const res = await waitForHealth(port, 5000);
      expect(res.status).toBe(200);
      const json = (await res.json()) as { status: string };
      expect(json).toEqual({ status: 'ok' });
      expect(res.headers.get('x-correlation-id')).toBeTruthy();
    });

    it('AC-2: with invalid env variables, exits with code 1 in < 5s and logs stderr JSON with invalidVariables', async () => {
      const child = startApp({ PORT: 'abc', LOG_LEVEL: 'verbose' });
      spawnedProcesses.push(child);

      let stderr = '';
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      const exitCode = await new Promise<number | null>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Process did not exit within 5s')),
          5000,
        );
        child.on('exit', (code) => {
          clearTimeout(timer);
          resolve(code);
        });
      });

      expect(exitCode).toBe(1);
      const parsed = JSON.parse(stderr.trim()) as {
        level: string;
        msg: string;
        invalidVariables: string[];
      };
      expect(parsed.level).toBe('error');
      expect(parsed.invalidVariables).toContain('PORT');
      expect(parsed.invalidVariables).toContain('LOG_LEVEL');
      expect(stderr).not.toContain('abc');
      expect(stderr).not.toContain('verbose');
    });

    it('AC-14: after /health OK, child.kill("SIGTERM") exits with code 0 in < 5s', async () => {
      const port = await freePort();
      const child = startApp({ PORT: String(port), LOG_LEVEL: 'error' });
      spawnedProcesses.push(child);

      await waitForHealth(port, 5000);

      const exitPromise = new Promise<number | null>((resolve, reject) => {
        const timer = setTimeout(
          () =>
            reject(new Error('Process did not exit within 5s after SIGTERM')),
          5000,
        );
        child.on('exit', (code) => {
          clearTimeout(timer);
          resolve(code);
        });
      });

      child.kill('SIGTERM');
      const exitCode = await exitPromise;
      expect(exitCode).toBe(0);
    });
  });
});
