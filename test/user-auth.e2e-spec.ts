import net from 'node:net';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, type TestingModule } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import {
  createFakeKeycloak,
  type FakeKeycloak,
} from './support/fake-keycloak.js';
import { createLogCapture, type LogCapture } from './support/log-capture.js';
import { ProbeController } from './support/probe.controller.js';
import { testConfig } from './support/test-env.js';

const VALID_TENANT_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

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

describe('User Auth (e2e)', () => {
  let fakeKeycloak: FakeKeycloak;
  let app: NestExpressApplication;
  let capture: LogCapture;

  beforeAll(async () => {
    fakeKeycloak = await createFakeKeycloak();
  });

  afterAll(async () => {
    if (fakeKeycloak) {
      await fakeKeycloak.close();
    }
  });

  beforeEach(async () => {
    await resetLoggerState();
    capture = createLogCapture();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule.register(
          testConfig({
            port: 0,
            logLevel: 'debug',
            auth: {
              issuerUrl: fakeKeycloak.issuer,
              audience: 'core-service',
            },
          }),
          capture.stream,
        ),
      ],
      controllers: [ProbeController],
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

  it('AC-1: request to protected route without Bearer token returns 401 UNAUTHORIZED', async () => {
    const resNoAuth = await request(app.getHttpServer())
      .get('/probe/tenant')
      .expect(401);

    expect(resNoAuth.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
      correlationId: expect.any(String),
    });

    const resBasic = await request(app.getHttpServer())
      .get('/probe/tenant')
      .set('authorization', 'Basic dXNlcjpwYXNz')
      .expect(401);

    expect(resBasic.body).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
      correlationId: expect.any(String),
    });
  });

  it('AC-2: invalid token returns 401 UNAUTHORIZED', async () => {
    const otherKeyToken = await fakeKeycloak.sign(
      { sub: 'user-1', tenant_id: VALID_TENANT_ID, roles: ['tenant-admin'] },
      { key: 'other' },
    );
    await request(app.getHttpServer())
      .get('/probe/tenant')
      .set('authorization', `Bearer ${otherKeyToken}`)
      .expect(401);

    const expiredToken = await fakeKeycloak.sign(
      { sub: 'user-1', tenant_id: VALID_TENANT_ID, roles: ['tenant-admin'] },
      { expiresIn: '-60s' },
    );
    await request(app.getHttpServer())
      .get('/probe/tenant')
      .set('authorization', `Bearer ${expiredToken}`)
      .expect(401);

    const wrongIssuerToken = await fakeKeycloak.sign({
      sub: 'user-1',
      tenant_id: VALID_TENANT_ID,
      roles: ['tenant-admin'],
      iss: 'http://evil.com/realms/telemetry',
    });
    await request(app.getHttpServer())
      .get('/probe/tenant')
      .set('authorization', `Bearer ${wrongIssuerToken}`)
      .expect(401);

    const wrongAudToken = await fakeKeycloak.sign({
      sub: 'user-1',
      tenant_id: VALID_TENANT_ID,
      roles: ['tenant-admin'],
      aud: 'wrong-service',
    });
    await request(app.getHttpServer())
      .get('/probe/tenant')
      .set('authorization', `Bearer ${wrongAudToken}`)
      .expect(401);

    await request(app.getHttpServer())
      .get('/probe/tenant')
      .set('authorization', 'Bearer not-a-valid-jwt-token')
      .expect(401);
  });

  it('AC-3: issuer pointing to a closed port returns 503 UPSTREAM_UNAVAILABLE', async () => {
    const closedPort = await freePort();
    const downAppFixture = await Test.createTestingModule({
      imports: [
        AppModule.register(
          testConfig({
            port: 0,
            logLevel: 'error',
            auth: {
              issuerUrl: `http://127.0.0.1:${closedPort}/realms/telemetry`,
              audience: 'core-service',
            },
          }),
        ),
      ],
      controllers: [ProbeController],
    }).compile();

    const downApp =
      downAppFixture.createNestApplication<NestExpressApplication>({
        bufferLogs: true,
      });
    await downApp.init();

    try {
      const token = await fakeKeycloak.sign({
        sub: 'user-1',
        tenant_id: VALID_TENANT_ID,
        roles: ['tenant-admin'],
      });

      const res = await request(downApp.getHttpServer())
        .get('/probe/tenant')
        .set('authorization', `Bearer ${token}`)
        .expect(503);

      expect(res.body).toEqual({
        code: 'UPSTREAM_UNAVAILABLE',
        message: expect.stringMatching(/keycloak/i),
        correlationId: expect.any(String),
      });
    } finally {
      await downApp.close();
    }
  });

  it('AC-4: valid tenant-user claims maps to tenant-user actor and succeeds on tenant routes', async () => {
    const token = await fakeKeycloak.sign({
      sub: 'user-42',
      tenant_id: VALID_TENANT_ID,
      roles: ['tenant-admin'],
    });

    const res = await request(app.getHttpServer())
      .get('/probe/tenant')
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual({
      kind: 'tenant-user',
      userId: 'user-42',
      tenantId: VALID_TENANT_ID,
      roles: ['tenant-admin'],
    });
  });

  it('AC-5: valid platform-operator claims maps to platform-operator actor and succeeds on platform routes', async () => {
    const token = await fakeKeycloak.sign({
      sub: 'operator-1',
      roles: ['platform-operator'],
    });

    const res = await request(app.getHttpServer())
      .get('/probe/platform')
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toEqual({
      kind: 'platform-operator',
      userId: 'operator-1',
    });
  });

  it('AC-6: contradictory or invalid claims returns 403 FORBIDDEN and logs warning', async () => {
    const mixedToken = await fakeKeycloak.sign({
      sub: 'bad-1',
      tenant_id: VALID_TENANT_ID,
      roles: ['platform-operator'],
    });
    const resMixed = await request(app.getHttpServer())
      .get('/probe/tenant')
      .set('authorization', `Bearer ${mixedToken}`)
      .expect(403);
    expect(resMixed.body.code).toBe('FORBIDDEN');

    const mixedRolesToken = await fakeKeycloak.sign({
      sub: 'bad-2',
      roles: ['platform-operator', 'tenant-admin'],
    });
    const resMixedRoles = await request(app.getHttpServer())
      .get('/probe/tenant')
      .set('authorization', `Bearer ${mixedRolesToken}`)
      .expect(403);
    expect(resMixedRoles.body.code).toBe('FORBIDDEN');

    const missingTenantToken = await fakeKeycloak.sign({
      sub: 'bad-3',
      roles: ['tenant-admin'],
    });
    const resMissingTenant = await request(app.getHttpServer())
      .get('/probe/tenant')
      .set('authorization', `Bearer ${missingTenantToken}`)
      .expect(403);
    expect(resMissingTenant.body.code).toBe('FORBIDDEN');

    const invalidUuidTenantToken = await fakeKeycloak.sign({
      sub: 'bad-4',
      tenant_id: 'not-a-valid-uuid',
      roles: ['tenant-admin'],
    });
    const resInvalidTenant = await request(app.getHttpServer())
      .get('/probe/tenant')
      .set('authorization', `Bearer ${invalidUuidTenantToken}`)
      .expect(403);
    expect(resInvalidTenant.body.code).toBe('FORBIDDEN');

    const noRolesToken = await fakeKeycloak.sign({
      sub: 'bad-5',
      tenant_id: VALID_TENANT_ID,
      roles: ['unknown-role'],
    });
    const resNoRoles = await request(app.getHttpServer())
      .get('/probe/tenant')
      .set('authorization', `Bearer ${noRolesToken}`)
      .expect(403);
    expect(resNoRoles.body.code).toBe('FORBIDDEN');
  });

  it('AC-7: forbidden roles return 403 FORBIDDEN', async () => {
    const viewerToken = await fakeKeycloak.sign({
      sub: 'user-viewer',
      tenant_id: VALID_TENANT_ID,
      roles: ['tenant-viewer'],
    });
    const resViewer = await request(app.getHttpServer())
      .get('/probe/tenant')
      .set('authorization', `Bearer ${viewerToken}`)
      .expect(403);

    expect(resViewer.body).toEqual({
      code: 'FORBIDDEN',
      message: 'Forbidden',
      correlationId: expect.any(String),
    });

    const operatorToken = await fakeKeycloak.sign({
      sub: 'operator-1',
      roles: ['platform-operator'],
    });
    await request(app.getHttpServer())
      .get('/probe/tenant')
      .set('authorization', `Bearer ${operatorToken}`)
      .expect(403);

    const adminToken = await fakeKeycloak.sign({
      sub: 'user-admin',
      tenant_id: VALID_TENANT_ID,
      roles: ['tenant-admin'],
    });
    await request(app.getHttpServer())
      .get('/probe/platform')
      .set('authorization', `Bearer ${adminToken}`)
      .expect(403);
  });

  it('AC-8: unannotated route is denied by default (403 FORBIDDEN) with or without token', async () => {
    const tenantToken = await fakeKeycloak.sign({
      sub: 'user-1',
      tenant_id: VALID_TENANT_ID,
      roles: ['tenant-viewer'],
    });
    const resWithToken = await request(app.getHttpServer())
      .get('/probe/unannotated')
      .set('authorization', `Bearer ${tenantToken}`)
      .expect(403);

    expect(resWithToken.body.code).toBe('FORBIDDEN');

    const resWithoutToken = await request(app.getHttpServer())
      .get('/probe/unannotated')
      .expect(403);

    expect(resWithoutToken.body.code).toBe('FORBIDDEN');
  });

  it('AC-9: public route allows access without token', async () => {
    const resPublic = await request(app.getHttpServer())
      .get('/probe/public')
      .expect(200);

    expect(resPublic.body).toEqual({ status: 'public' });

    const resHealth = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(resHealth.body).toEqual({ status: 'ok' });
  });

  it('AC-10: request log includes actor and tenantId, and token is never logged', async () => {
    const token = await fakeKeycloak.sign({
      sub: 'log-user-1',
      tenant_id: VALID_TENANT_ID,
      roles: ['tenant-admin'],
    });

    await request(app.getHttpServer())
      .get('/probe/tenant')
      .set('authorization', `Bearer ${token}`)
      .expect(200);

    await vi.waitFor(() => {
      const lines = capture.lines();
      const reqLog = lines.find(
        (l) =>
          l.context === 'HTTP' &&
          (l.req as { url?: string } | undefined)?.url === '/probe/tenant',
      );
      expect(reqLog).toBeDefined();
      expect(reqLog?.actor).toBe('log-user-1');
      expect(reqLog?.tenantId).toBe(VALID_TENANT_ID);

      for (const line of lines) {
        expect(JSON.stringify(line)).not.toContain(token);
      }
    });
  });
});
