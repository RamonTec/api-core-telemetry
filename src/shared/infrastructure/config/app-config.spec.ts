import { z } from 'zod';
import {
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
  describe('loadConfig', () => {
    it('AC-1: empty env returns default { port: 3000, logLevel: "info" }', () => {
      expect(loadConfig({})).toEqual({
        port: 3000,
        logLevel: 'info',
      });
    });

    it('AC-1: empty string values are treated as absent and apply defaults', () => {
      expect(loadConfig({ PORT: '', LOG_LEVEL: '' })).toEqual({
        port: 3000,
        logLevel: 'info',
      });
    });

    it('AC-1: accepts valid PORT and LOG_LEVEL overrides', () => {
      expect(loadConfig({ PORT: '8080', LOG_LEVEL: 'debug' })).toEqual({
        port: 8080,
        logLevel: 'debug',
      });
    });

    it('AC-1: ignores undeclared environment variables', () => {
      expect(loadConfig({ UNRELATED: 'xyz' })).toEqual({
        port: 3000,
        logLevel: 'info',
      });
    });

    it('AC-2: PORT=abc LOG_LEVEL=verbose throws ConfigValidationError with invalidVariables = ["PORT", "LOG_LEVEL"]', () => {
      const error = captureError(() =>
        loadConfig({ PORT: 'abc', LOG_LEVEL: 'verbose' }),
      );
      expect(error.invalidVariables).toEqual(['PORT', 'LOG_LEVEL']);
    });

    it('AC-2: error message lists invalid variable names but never their values', () => {
      const error = captureError(() =>
        loadConfig({
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
        const error = captureError(() => loadConfig({ PORT: port }));
        expect(error.invalidVariables).toEqual(['PORT']);
      },
    );

    it.each(LOG_LEVELS)('AC-7: LOG_LEVEL accepts valid level %s', (level) => {
      expect(loadConfig({ LOG_LEVEL: level })).toEqual({
        port: 3000,
        logLevel: level,
      });
    });

    it.each(['trace', 'verbose', 'fatal', 'INFO', 'unknown'])(
      'AC-7: LOG_LEVEL rejects invalid level %s',
      (level) => {
        const error = captureError(() => loadConfig({ LOG_LEVEL: level }));
        expect(error.invalidVariables).toEqual(['LOG_LEVEL']);
      },
    );
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
