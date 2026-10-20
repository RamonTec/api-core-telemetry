import { type DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import type { DestinationStream } from 'pino';
import { AuditModule } from './shared/infrastructure/audit/audit.module.js';
import { AuthModule } from './shared/infrastructure/auth/auth.module.js';
import type { JwtVerifier } from './shared/infrastructure/auth/jwt-verifier.js';
import {
  APP_CONFIG,
  type AppConfig,
} from './shared/infrastructure/config/app-config.js';
import { DatabaseModule } from './shared/infrastructure/database/database.module.js';
import { HealthModule } from './shared/infrastructure/health/health.module.js';
import { HealthController } from './shared/infrastructure/http/health.controller.js';
import { HttpExceptionFilter } from './shared/infrastructure/http/http-exception.filter.js';
import { LoggingModule } from './shared/infrastructure/logging/logging.module.js';

@Module({})
export class AppModule {
  static register(
    config: AppConfig,
    logStream?: DestinationStream,
    overrides?: { jwtVerifier?: JwtVerifier },
  ): DynamicModule {
    const configModule: DynamicModule = {
      module: class ConfigModule {},
      global: true,
      providers: [{ provide: APP_CONFIG, useValue: config }],
      exports: [APP_CONFIG],
    };

    return {
      module: AppModule,
      imports: [
        configModule,
        HealthModule,
        DatabaseModule,
        AuditModule,
        LoggingModule.forRoot(config, logStream),
        AuthModule.forRoot(config.auth, overrides),
      ],
      controllers: [HealthController],
      providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
    };
  }
}
