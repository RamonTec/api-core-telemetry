import { z } from 'zod';
import {
  type AuthConfig,
  ConfigValidationError,
  loadConfig,
  LOG_LEVELS,
  parseEnv,
} from './app-config.js';

function captureError(fn: () => unknown): ConfigValidationError {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(ConfigValidationError);
    return error as ConfigValidationError;
  }
  throw new Error('Expected ConfigValidationError to be thrown');
}

describe('app-config', () => {
  const validBaseEnv = {
    KEYCLOAK_ISSUER_URL: 'http://keycloak.test/realms/telemetry',
    DATABASE_URL: 'mysql://root:test@127.0.0.1:3307/core_test',
  };

  describe('loadConfig', () => {
    it('AC-1: with base env, returns default port, logLevel, and auth.audience', () => {
      expect(loadConfig(validBaseEnv)).toEqual({
        port: 3000,
        logLevel: 'info',
        auth: {
          issuerUrl: 'http://keycloak.test/realms/telemetry',
          audience: 'core-service',
        },
        database: {
          url: 'mysql://root:test@127.0.0.1:3307/core_test',
        },
      });
    });

    it('AC-1: empty string values are treated as absent and apply defaults', () => {
      expect(
        loadConfig({
          ...validBaseEnv,
          PORT: '',
          LOG_LEVEL: '',
          KEYCLOAK_AUDIENCE: '',
        }),
      ).toEqual({
        port: 3000,
        logLevel: 'info',
        auth: {
          issuerUrl: 'http://keycloak.test/realms/telemetry',
          audience: 'core-service',
        },
        database: {
          url: 'mysql://root:test@127.0.0.1:3307/core_test',
        },
      });
    });

    it('AC-1: accepts valid PORT and LOG_LEVEL overrides', () => {
      expect(
        loadConfig({
          ...validBaseEnv,
          PORT: '8080',
          LOG_LEVEL: 'debug',
        }),
      ).toEqual({
        port: 8080,
        logLevel: 'debug',
        auth: {
          issuerUrl: 'http://keycloak.test/realms/telemetry',
          audience: 'core-service',
        },
        database: {
          url: 'mysql://root:test@127.0.0.1:3307/core_test',
        },
      });
    });

    it('AC-1: ignores undeclared environment variables', () => {
      expect(
        loadConfig({
          ...validBaseEnv,
          UNRELATED: 'xyz',
        }),
      ).toEqual({
        port: 3000,
        logLevel: 'info',
        auth: {
          issuerUrl: 'http://keycloak.test/realms/telemetry',
          audience: 'core-service',
        },
        database: {
          url: 'mysql://root:test@127.0.0.1:3307/core_test',
        },
      });
    });

    it('AC-2: PORT=abc LOG_LEVEL=verbose throws ConfigValidationError with invalidVariables = ["PORT", "LOG_LEVEL"]', () => {
      const error = captureError(() =>
        loadConfig({
          ...validBaseEnv,
          PORT: 'abc',
          LOG_LEVEL: 'verbose',
        }),
      );
      expect(error.invalidVariables).toEqual(['PORT', 'LOG_LEVEL']);
    });

    it('AC-2: error message lists invalid variable names but never their values', () => {
      const error = captureError(() =>
        loadConfig({
          ...validBaseEnv,
          PORT: 'secret-port-value',
          LOG_LEVEL: 'super-secret-level',
        }),
      );
      expect(error.message).toBe(
        'Invalid environment variables: PORT, LOG_LEVEL',
      );
      expect(error.message).not.toContain('secret-port-value');
      expect(error.message).not.toContain('super-secret-level');
    });

    it.each(['0', '65536', '3.5', '-1'])(
      'AC-2: rejects out-of-range or non-integer PORT=%s',
      (port) => {
        const error = captureError(() =>
          loadConfig({ ...validBaseEnv, PORT: port }),
        );
        expect(error.invalidVariables).toEqual(['PORT']);
      },
    );

    it.each(LOG_LEVELS)('AC-7: LOG_LEVEL accepts valid level %s', (level) => {
      expect(loadConfig({ ...validBaseEnv, LOG_LEVEL: level })).toEqual({
        port: 3000,
        logLevel: level,
        auth: {
          issuerUrl: 'http://keycloak.test/realms/telemetry',
          audience: 'core-service',
        },
        database: {
          url: 'mysql://root:test@127.0.0.1:3307/core_test',
        },
      });
    });

    it.each(['trace', 'verbose', 'fatal', 'INFO', 'unknown'])(
      'AC-7: LOG_LEVEL rejects invalid level %s',
      (level) => {
        const error = captureError(() =>
          loadConfig({ ...validBaseEnv, LOG_LEVEL: level }),
        );
        expect(error.invalidVariables).toEqual(['LOG_LEVEL']);
      },
    );

    describe('AC-11: Keycloak auth configuration', () => {
      it('AC-11: missing KEYCLOAK_ISSUER_URL throws ConfigValidationError naming it', () => {
        const error = captureError(() => loadConfig({}));
        expect(error.invalidVariables).toContain('KEYCLOAK_ISSUER_URL');
      });

      it('AC-11: empty string KEYCLOAK_ISSUER_URL throws ConfigValidationError naming it', () => {
        const error = captureError(() =>
          loadConfig({ KEYCLOAK_ISSUER_URL: '' }),
        );
        expect(error.invalidVariables).toContain('KEYCLOAK_ISSUER_URL');
      });

      it('AC-11: invalid KEYCLOAK_ISSUER_URL URL throws ConfigValidationError naming it', () => {
        const error = captureError(() =>
          loadConfig({ KEYCLOAK_ISSUER_URL: 'not-a-valid-url' }),
        );
        expect(error.invalidVariables).toContain('KEYCLOAK_ISSUER_URL');
      });

      it('AC-11: defaults KEYCLOAK_AUDIENCE to core-service', () => {
        const config = loadConfig(validBaseEnv);
        expect(config.auth.audience).toBe('core-service');
      });

      it('AC-11: strips trailing slashes from KEYCLOAK_ISSUER_URL', () => {
        const config = loadConfig({
          ...validBaseEnv,
          KEYCLOAK_ISSUER_URL: 'http://keycloak.test/realms/telemetry///',
        });
        expect(config.auth.issuerUrl).toBe(
          'http://keycloak.test/realms/telemetry',
        );
      });

      it('AC-11: accepts custom KEYCLOAK_AUDIENCE', () => {
        const config = loadConfig({
          ...validBaseEnv,
          KEYCLOAK_AUDIENCE: 'custom-client',
        });
        const expectedAuth: AuthConfig = {
          issuerUrl: 'http://keycloak.test/realms/telemetry',
          audience: 'custom-client',
        };
        expect(config.auth).toEqual(expectedAuth);
      });
    });

    describe('AC-1: Database configuration', () => {
      it('AC-1: missing DATABASE_URL throws ConfigValidationError naming it', () => {
        const error = captureError(() =>
          loadConfig({
            KEYCLOAK_ISSUER_URL: 'http://keycloak.test/realms/telemetry',
          }),
        );
        expect(error.invalidVariables).toContain('DATABASE_URL');
      });

      it('AC-1: empty string DATABASE_URL throws ConfigValidationError naming it', () => {
        const error = captureError(() =>
          loadConfig({
            ...validBaseEnv,
            DATABASE_URL: '',
          }),
        );
        expect(error.invalidVariables).toContain('DATABASE_URL');
      });

      it.each([
        'postgres://user:pass@localhost:5432/db',
        'mysql:',
        'mysql://',
        'http://localhost:3306',
        'not-a-url',
      ])(
        'AC-1: DATABASE_URL without mysql:// scheme throws ConfigValidationError naming it (%s)',
        (url) => {
          const error = captureError(() =>
            loadConfig({
              ...validBaseEnv,
              DATABASE_URL: url,
            }),
          );
          expect(error.invalidVariables).toContain('DATABASE_URL');
        },
      );

      it('AC-1: error message does not contain DATABASE_URL secret or value', () => {
        const error = captureError(() =>
          loadConfig({
            ...validBaseEnv,
            DATABASE_URL:
              'mysql-without-double-slash-and-super-secret-password',
          }),
        );
        expect(error.message).toBe(
          'Invalid environment variables: DATABASE_URL',
        );
        expect(error.message).not.toContain('super-secret-password');
      });

      it('AC-1: accepts valid DATABASE_URL with mysql:// scheme', () => {
        const config = loadConfig({
          ...validBaseEnv,
          DATABASE_URL: 'mysql://root:test@127.0.0.1:3307/core_test',
        });
        expect(config.database).toEqual({
          url: 'mysql://root:test@127.0.0.1:3307/core_test',
        });
      });
    });
  });

  describe('parseEnv', () => {
    const schema = z.object({
      PORT: z.coerce.number().default(3000),
      NAME: z.string().min(1),
    });

    it('AC-1: treats missing and empty string as absent', () => {
      const error = captureError(() => parseEnv(schema, { NAME: '' }));
      expect(error.invalidVariables).toEqual(['NAME']);
    });

    it('AC-1: returns parsed data when valid', () => {
      expect(parseEnv(schema, { NAME: 'test' })).toEqual({
        PORT: 3000,
        NAME: 'test',
      });
    });
  });
});
