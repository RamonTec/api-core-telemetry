import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import * as jose from 'jose';

export interface FakeKeycloak {
  issuer: string;
  sign(
    claims: Record<string, unknown>,
    opts?: { expiresIn?: string; alg?: string; key?: 'other' },
  ): Promise<string>;
  close(): Promise<void>;
}

export async function createFakeKeycloak(): Promise<FakeKeycloak> {
  const mainKeyPair = await jose.generateKeyPair('RS256', {
    modulusLength: 2048,
  });
  const otherKeyPair = await jose.generateKeyPair('RS256', {
    modulusLength: 2048,
  });

  const mainJwk = await jose.exportJWK(mainKeyPair.publicKey);
  mainJwk.kid = 'fake-keycloak-key-1';
  mainJwk.alg = 'RS256';
  mainJwk.use = 'sig';

  let server: Server;
  let issuer = '';

  await new Promise<void>((resolve, reject) => {
    server = createServer((req, res) => {
      const url = req.url
        ? new URL(req.url, 'http://127.0.0.1')
        : new URL('http://127.0.0.1');

      if (url.pathname.endsWith('/protocol/openid-connect/certs')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ keys: [mainJwk] }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo;
      issuer = `http://127.0.0.1:${addr.port}/realms/telemetry`;
      resolve();
    });
    server.on('error', reject);
  });

  return {
    issuer,
    async sign(
      claims: Record<string, unknown>,
      opts?: { expiresIn?: string; alg?: string; key?: 'other' },
    ): Promise<string> {
      const isOther = opts?.key === 'other';
      const keyPair = isOther ? otherKeyPair : mainKeyPair;
      const kid = isOther ? 'fake-keycloak-key-other' : 'fake-keycloak-key-1';
      const alg = opts?.alg ?? 'RS256';

      const payload: Record<string, unknown> = { ...claims };

      if (Array.isArray(claims.roles)) {
        const roles = claims.roles as string[];
        const platformRoles = roles.filter((r) => r === 'platform-operator');
        const clientRoles = roles.filter((r) => r !== 'platform-operator');

        if (!('realm_access' in payload) && platformRoles.length > 0) {
          payload.realm_access = { roles: platformRoles };
        }
        if (
          !('resource_access' in payload) &&
          (clientRoles.length > 0 || platformRoles.length === 0)
        ) {
          payload.resource_access = { 'core-service': { roles: clientRoles } };
        }
      }

      const jwt = new jose.SignJWT(payload).setProtectedHeader({ alg, kid });

      if (typeof claims.iat !== 'number') {
        jwt.setIssuedAt();
      }

      if (typeof claims.iss !== 'string') {
        jwt.setIssuer(issuer);
      }

      if (typeof claims.aud !== 'string' && !Array.isArray(claims.aud)) {
        jwt.setAudience('core-service');
      }

      if (opts?.expiresIn) {
        jwt.setExpirationTime(opts.expiresIn);
      } else if (typeof claims.exp !== 'number') {
        jwt.setExpirationTime('1h');
      }

      return jwt.sign(keyPair.privateKey);
    },
    close(): Promise<void> {
      return new Promise((resolve, reject) => {
        if (!server.listening) {
          resolve();
          return;
        }
        server.close((err) => {
          if (
            err &&
            (err as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING'
          ) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    },
  };
}
