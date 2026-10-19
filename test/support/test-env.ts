import {
  type AppConfig,
  type AuthConfig,
  type DatabaseConfig,
  loadConfig,
} from '../../src/shared/infrastructure/config/app-config.js';

export const TEST_ENV: Readonly<Record<string, string>> = Object.freeze({
  KEYCLOAK_ISSUER_URL: 'http://keycloak.test/realms/telemetry',
  DATABASE_URL:
    process.env['DATABASE_TEST_URL'] ??
    'mysql://root:test@127.0.0.1:3307/core_test',
});

export type TestConfigOverrides = Partial<
  Omit<AppConfig, 'auth' | 'database'>
> & {
  readonly auth?: Partial<AuthConfig>;
  readonly database?: Partial<DatabaseConfig>;
};

export function testConfig(overrides?: TestConfigOverrides): AppConfig {
  const base = loadConfig(TEST_ENV);
  if (!overrides) {
    return base;
  }
  return {
    ...base,
    ...overrides,
    auth: {
      ...base.auth,
      ...overrides.auth,
    },
    database: {
      ...base.database,
      ...overrides.database,
    },
  };
}
