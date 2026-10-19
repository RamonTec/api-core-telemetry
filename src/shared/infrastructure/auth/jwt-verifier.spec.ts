import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type GenerateKeyPairResult,
  type JWTVerifyGetKey,
  SignJWT,
} from 'jose';
import type { AuthConfig } from '../config/app-config.js';
import { InvalidTokenError, JwtVerifier } from './jwt-verifier.js';

describe('JwtVerifier', () => {
  const authConfig: AuthConfig = {
    issuerUrl: 'https://keycloak.example.com/realms/telemetry',
    audience: 'core-service',
  };

  let primaryKeys: GenerateKeyPairResult;
  let untrustedKeys: GenerateKeyPairResult;
  let localJWKS: JWTVerifyGetKey;

  beforeAll(async () => {
    primaryKeys = await generateKeyPair('RS256');
    untrustedKeys = await generateKeyPair('RS256');

    const primaryJwk = await exportJWK(primaryKeys.publicKey);
    primaryJwk.kid = 'primary-key-id';
    primaryJwk.alg = 'RS256';

    localJWKS = createLocalJWKSet({ keys: [primaryJwk] });
  });

  async function createToken(
    claims: Record<string, unknown> = {},
    options?: {
      key?: CryptoKey;
      kid?: string;
      alg?: string;
      issuer?: string;
      audience?: string | string[];
      expiresIn?: number | string;
      notBefore?: number | string;
      sub?: string | null;
    },
  ): Promise<string> {
    const payload: Record<string, unknown> = {
      ...claims,
    };

    const alg = options?.alg ?? 'RS256';
    const header: { alg: string; kid?: string } = { alg };
    if (options?.kid !== undefined) {
      header.kid = options.kid;
    } else if (alg === 'RS256') {
      header.kid = 'primary-key-id';
    }

    const jwt = new SignJWT(payload).setProtectedHeader(header);
    jwt.setIssuer(options?.issuer ?? authConfig.issuerUrl);
    jwt.setAudience(options?.audience ?? authConfig.audience);

    if (options?.sub !== null) {
      jwt.setSubject(options?.sub ?? 'user-123');
    }

    if (options?.expiresIn !== undefined) {
      jwt.setExpirationTime(options.expiresIn);
    } else {
      jwt.setExpirationTime('1h');
    }

    if (options?.notBefore !== undefined) {
      jwt.setNotBefore(options.notBefore);
    }

    const key = options?.key ?? primaryKeys.privateKey;
    return jwt.sign(key);
  }

  describe('AC-2: signature and malformed token', () => {
    it('AC-2: rejects token signed with an untrusted key with SIGNATURE', async () => {
      const verifier = new JwtVerifier(authConfig, localJWKS);
      const token = await createToken({}, { key: untrustedKeys.privateKey });

      await expect(verifier.verify(token)).rejects.toThrow(InvalidTokenError);
      await expect(verifier.verify(token)).rejects.toMatchObject({
        reason: 'SIGNATURE',
      });
    });

    it.each(['abc', '', 'not-a-jwt', 'a.b'])(
      'AC-2: rejects malformed token %j with MALFORMED',
      async (malformed) => {
        const verifier = new JwtVerifier(authConfig, localJWKS);

        await expect(verifier.verify(malformed)).rejects.toThrow(
          InvalidTokenError,
        );
        await expect(verifier.verify(malformed)).rejects.toMatchObject({
          reason: 'MALFORMED',
        });
      },
    );

    it('AC-2: rejects token signed with HS256 with ALGORITHM', async () => {
      const verifier = new JwtVerifier(authConfig, localJWKS);
      const hmacSecret = new TextEncoder().encode(
        'secret-key-at-least-32-chars-long!',
      );
      const token = await new SignJWT({ sub: 'user-123' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer(authConfig.issuerUrl)
        .setAudience(authConfig.audience)
        .setExpirationTime('1h')
        .sign(hmacSecret);

      await expect(verifier.verify(token)).rejects.toThrow(InvalidTokenError);
      await expect(verifier.verify(token)).rejects.toMatchObject({
        reason: 'ALGORITHM',
      });
    });

    it('AC-2: rejects token expired 60s ago with EXPIRED', async () => {
      const verifier = new JwtVerifier(authConfig, localJWKS);
      const expiredTime = Math.floor(Date.now() / 1000) - 60;
      const token = await createToken({}, { expiresIn: expiredTime });

      await expect(verifier.verify(token)).rejects.toThrow(InvalidTokenError);
      await expect(verifier.verify(token)).rejects.toMatchObject({
        reason: 'EXPIRED',
      });
    });

    it('AC-2: accepts token expired 10s ago due to 30s clock tolerance', async () => {
      const verifier = new JwtVerifier(authConfig, localJWKS);
      const graceTime = Math.floor(Date.now() / 1000) - 10;
      const token = await createToken({}, { expiresIn: graceTime });

      const claims = await verifier.verify(token);
      expect(claims.sub).toBe('user-123');
    });

    it('AC-2: rejects token with different issuer with CLAIMS', async () => {
      const verifier = new JwtVerifier(authConfig, localJWKS);
      const token = await createToken(
        {},
        { issuer: 'https://evil-issuer.com' },
      );

      await expect(verifier.verify(token)).rejects.toThrow(InvalidTokenError);
      await expect(verifier.verify(token)).rejects.toMatchObject({
        reason: 'CLAIMS',
      });
    });

    it('AC-2: rejects token without configured audience with CLAIMS', async () => {
      const verifier = new JwtVerifier(authConfig, localJWKS);
      const token = await createToken({}, { audience: 'different-audience' });

      await expect(verifier.verify(token)).rejects.toThrow(InvalidTokenError);
      await expect(verifier.verify(token)).rejects.toMatchObject({
        reason: 'CLAIMS',
      });
    });

    it('AC-2: rejects token missing sub claim with CLAIMS', async () => {
      const verifier = new JwtVerifier(authConfig, localJWKS);
      const token = await createToken({}, { sub: null });

      await expect(verifier.verify(token)).rejects.toThrow(InvalidTokenError);
      await expect(verifier.verify(token)).rejects.toMatchObject({
        reason: 'CLAIMS',
      });
    });

    it('AC-2: rejects token with empty string sub claim with CLAIMS', async () => {
      const verifier = new JwtVerifier(authConfig, localJWKS);
      const token = await createToken({}, { sub: '   ' });

      await expect(verifier.verify(token)).rejects.toThrow(InvalidTokenError);
      await expect(verifier.verify(token)).rejects.toMatchObject({
        reason: 'CLAIMS',
      });
    });

    it('AC-2: rejects token with notBefore in the future with CLAIMS', async () => {
      const verifier = new JwtVerifier(authConfig, localJWKS);
      const futureTime = Math.floor(Date.now() / 1000) + 60;
      const token = await createToken({}, { notBefore: futureTime });

      await expect(verifier.verify(token)).rejects.toThrow(InvalidTokenError);
      await expect(verifier.verify(token)).rejects.toMatchObject({
        reason: 'CLAIMS',
      });
    });
  });

  describe('AC-3: JWKS unavailable', () => {
    it('AC-3: throws JWKS_UNAVAILABLE when JWKS server is unreachable', async () => {
      const probeServer = createServer();
      await new Promise<void>((resolve) => probeServer.listen(0, resolve));
      const port = (probeServer.address() as AddressInfo).port;
      await new Promise<void>((resolve) => probeServer.close(() => resolve()));

      const closedUrl = `http://127.0.0.1:${port}`;
      const verifier = new JwtVerifier({
        issuerUrl: closedUrl,
        audience: 'core-service',
      });

      const kp = await generateKeyPair('RS256');
      const token = await new SignJWT({ sub: 'user-any' })
        .setProtectedHeader({ alg: 'RS256', kid: 'any' })
        .setIssuer(closedUrl)
        .setAudience('core-service')
        .setExpirationTime('1h')
        .sign(kp.privateKey);

      await expect(verifier.verify(token)).rejects.toThrow(InvalidTokenError);
      await expect(verifier.verify(token)).rejects.toMatchObject({
        reason: 'JWKS_UNAVAILABLE',
      });
    });
  });

  describe('VerifiedClaims extraction', () => {
    it('returns VerifiedClaims with sub, tenantId, clientRoles, realmRoles', async () => {
      const verifier = new JwtVerifier(authConfig, localJWKS);
      const token = await createToken({
        tenant_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        resource_access: {
          'core-service': {
            roles: ['tenant-admin', 'driver', 123, null],
          },
          'other-service': {
            roles: ['ignored'],
          },
        },
        realm_access: {
          roles: ['platform-operator', 'default-roles', 456],
        },
      });

      const claims = await verifier.verify(token);

      expect(claims).toEqual({
        sub: 'user-123',
        tenantId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        clientRoles: ['tenant-admin', 'driver'],
        realmRoles: ['platform-operator', 'default-roles'],
      });
    });

    it('returns undefined tenantId and empty roles when absent from payload', async () => {
      const verifier = new JwtVerifier(authConfig, localJWKS);
      const token = await createToken({});

      const claims = await verifier.verify(token);

      expect(claims).toEqual({
        sub: 'user-123',
        tenantId: undefined,
        clientRoles: [],
        realmRoles: [],
      });
    });
  });
});
