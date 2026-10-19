import { Controller, Get, type INestApplication } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Logger } from 'nestjs-pino';
import request from 'supertest';
import type { Actor } from '../../application/actor.js';
import { HttpExceptionFilter } from '../http/http-exception.filter.js';
import { LoggingModule } from '../logging/logging.module.js';
import {
  createLogCapture,
  type LogCapture,
} from '../../../../test/support/log-capture.js';
import { testConfig } from '../../../../test/support/test-env.js';
import { CurrentActor, Public, Roles } from './auth.decorators.js';
import {
  InvalidTokenError,
  JwtVerifier,
  type VerifiedClaims,
} from './jwt-verifier.js';
import { UserAuthGuard } from './user-auth.guard.js';

@Controller()
class DummyController {
  @Public()
  @Get('open')
  open() {
    return { ok: true };
  }

  @Roles('tenant-admin')
  @Get('admin-only')
  adminOnly(@CurrentActor() actor?: Actor) {
    return actor;
  }

  @Roles('tenant-admin', 'tenant-operator')
  @Get('tenant-work')
  tenantWork(@CurrentActor() actor?: Actor) {
    return actor;
  }

  @Roles('platform-operator')
  @Get('platform-only')
  platformOnly(@CurrentActor() actor?: Actor) {
    return actor;
  }

  @Get('unannotated')
  unannotated() {
    return { ok: true };
  }
}

type VerifyImpl = (token: string) => Promise<VerifiedClaims>;

class FakeJwtVerifier implements Pick<JwtVerifier, 'verify'> {
  impl: VerifyImpl = () => Promise.reject(new InvalidTokenError('SIGNATURE'));
  readonly received: string[] = [];

  verify(token: string): Promise<VerifiedClaims> {
    this.received.push(token);
    return this.impl(token);
  }

  acceptAs(claims: VerifiedClaims): void {
    this.impl = () => Promise.resolve(claims);
  }

  rejectWith(err: Error): void {
    this.impl = () => Promise.reject(err);
  }
}

async function resetLoggerState(): Promise<void> {
  const url = new URL('./rootLogger.js', import.meta.resolve('nestjs-pino'));
  const { resetRootLogger } = (await import(url.href)) as {
    resetRootLogger: () => void;
  };
  resetRootLogger();
}

const TOKEN = 'valid.header.payload';
const VALID_TENANT_ID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

describe('UserAuthGuard (integration)', () => {
  let app: INestApplication;
  let logs: LogCapture;
  let verifier: FakeJwtVerifier;

  beforeEach(async () => {
    await resetLoggerState();
    logs = createLogCapture();
    verifier = new FakeJwtVerifier();

    const moduleRef = await Test.createTestingModule({
      imports: [
        LoggingModule.forRoot(testConfig({ logLevel: 'debug' }), logs.stream),
      ],
      controllers: [DummyController],
      providers: [
        { provide: JwtVerifier, useValue: verifier },
        { provide: APP_GUARD, useClass: UserAuthGuard },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    app.useLogger(app.get(Logger));
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    await resetLoggerState();
  });

  describe('AC-1: missing or invalid authorization header', () => {
    it('AC-1: returns 401 when Authorization header is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin-only')
        .expect(401);

      expect(res.body.code).toBe('UNAUTHORIZED');
      expect(verifier.received).toHaveLength(0);
    });

    it('AC-1: returns 401 when Authorization header is not Bearer', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin-only')
        .set('Authorization', 'Basic dXNlcjpwYXNz')
        .expect(401);

      expect(res.body.code).toBe('UNAUTHORIZED');
      expect(verifier.received).toHaveLength(0);
    });
  });

  describe('AC-2: invalid token', () => {
    it.each([
      'SIGNATURE',
      'EXPIRED',
      'CLAIMS',
      'ALGORITHM',
      'MALFORMED',
    ] as const)('AC-2: returns 401 and logs warn for %s', async (reason) => {
      verifier.rejectWith(new InvalidTokenError(reason));

      const res = await request(app.getHttpServer())
        .get('/admin-only')
        .set('Authorization', `Bearer ${TOKEN}`)
        .expect(401);

      expect(res.body.code).toBe('UNAUTHORIZED');
      expect(verifier.received).toContain(TOKEN);

      const warnLog = logs
        .lines()
        .find(
          (l) =>
            l.level === 'warn' &&
            l.msg === 'Rejected user token' &&
            l.reason === reason,
        );
      expect(warnLog).toBeDefined();
    });
  });

  describe('AC-3: JWKS unavailable', () => {
    it('AC-3: returns 503 UPSTREAM_UNAVAILABLE when verifier fails with JWKS_UNAVAILABLE', async () => {
      verifier.rejectWith(new InvalidTokenError('JWKS_UNAVAILABLE'));

      const res = await request(app.getHttpServer())
        .get('/admin-only')
        .set('Authorization', `Bearer ${TOKEN}`)
        .expect(503);

      expect(res.body.code).toBe('UPSTREAM_UNAVAILABLE');
    });
  });

  describe('AC-6: PADR-004 violation (actor rejection)', () => {
    it('AC-6: returns 403 and logs warn when claims violate PADR-004 (no recognized roles)', async () => {
      verifier.acceptAs({
        sub: 'user-no-role',
        tenantId: VALID_TENANT_ID,
        clientRoles: ['unknown-role'],
        realmRoles: [],
      });

      const res = await request(app.getHttpServer())
        .get('/admin-only')
        .set('Authorization', `Bearer ${TOKEN}`)
        .expect(403);

      expect(res.body.code).toBe('FORBIDDEN');

      const warnLog = logs
        .lines()
        .find((l) => l.level === 'warn' && l.reason === 'NO_KNOWN_ROLE');
      expect(warnLog).toBeDefined();
    });
  });

  describe('AC-7: role authorization', () => {
    it('AC-7: returns 403 when user does not have any declared role', async () => {
      verifier.acceptAs({
        sub: 'user-viewer',
        tenantId: VALID_TENANT_ID,
        clientRoles: ['tenant-viewer'],
        realmRoles: [],
      });

      const res = await request(app.getHttpServer())
        .get('/admin-only')
        .set('Authorization', `Bearer ${TOKEN}`)
        .expect(403);

      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('AC-7: returns 200 and passes actor to handler when user has required role', async () => {
      verifier.acceptAs({
        sub: 'user-admin',
        tenantId: VALID_TENANT_ID,
        clientRoles: ['tenant-admin'],
        realmRoles: [],
      });

      const res = await request(app.getHttpServer())
        .get('/admin-only')
        .set('Authorization', `Bearer ${TOKEN}`)
        .expect(200);

      expect(res.body).toEqual({
        kind: 'tenant-user',
        userId: 'user-admin',
        tenantId: VALID_TENANT_ID,
        roles: ['tenant-admin'],
      });
    });

    it('AC-7: accepts user when one of multiple declared roles matches', async () => {
      verifier.acceptAs({
        sub: 'user-operator',
        tenantId: VALID_TENANT_ID,
        clientRoles: ['tenant-operator'],
        realmRoles: [],
      });

      const res = await request(app.getHttpServer())
        .get('/tenant-work')
        .set('Authorization', `Bearer ${TOKEN}`)
        .expect(200);

      expect(res.body).toEqual({
        kind: 'tenant-user',
        userId: 'user-operator',
        tenantId: VALID_TENANT_ID,
        roles: ['tenant-operator'],
      });
    });

    it('AC-7: accepts platform-operator for platform-only route', async () => {
      verifier.acceptAs({
        sub: 'platform-admin',
        tenantId: undefined,
        clientRoles: [],
        realmRoles: ['platform-operator'],
      });

      const res = await request(app.getHttpServer())
        .get('/platform-only')
        .set('Authorization', `Bearer ${TOKEN}`)
        .expect(200);

      expect(res.body).toEqual({
        kind: 'platform-operator',
        userId: 'platform-admin',
      });
    });
  });

  describe('AC-8: default denial', () => {
    it('AC-8: returns 403 for unannotated route even with valid token', async () => {
      verifier.acceptAs({
        sub: 'user-admin',
        tenantId: VALID_TENANT_ID,
        clientRoles: ['tenant-admin'],
        realmRoles: [],
      });

      const res = await request(app.getHttpServer())
        .get('/unannotated')
        .set('Authorization', `Bearer ${TOKEN}`)
        .expect(403);

      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('AC-8: returns 403 for unannotated route without token', async () => {
      const res = await request(app.getHttpServer())
        .get('/unannotated')
        .expect(403);

      expect(res.body.code).toBe('FORBIDDEN');
    });
  });

  describe('AC-9: public routes', () => {
    it('AC-9: returns 200 without token on @Public() route', async () => {
      const res = await request(app.getHttpServer()).get('/open').expect(200);

      expect(res.body).toEqual({ ok: true });
      expect(verifier.received).toHaveLength(0);
    });
  });
});
