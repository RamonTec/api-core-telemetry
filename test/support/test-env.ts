import {
  type AppConfig,
  loadConfig,
} from '../../src/shared/infrastructure/config/app-config.js';

export const TEST_ENV: Readonly<Record<string, string>> = Object.freeze({});

export type TestConfigOverrides = Partial<AppConfig>;

export function testConfig(overrides?: TestConfigOverrides): AppConfig {
  const base = loadConfig(TEST_ENV);
  if (!overrides) {
    return base;
  }
  return {
    ...base,
    ...overrides,
  };
}
