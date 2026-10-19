import { type DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import type { DestinationStream } from 'pino';
import {
  APP_CONFIG,
  type AppConfig,
} from './shared/infrastructure/config/app-config.js';
import { HealthModule } from './shared/infrastructure/health/health.module.js';
import { HealthController } from './shared/infrastructure/http/health.controller.js';
import { HttpExceptionFilter } from './shared/infrastructure/http/http-exception.filter.js';
import { LoggingModule } from './shared/infrastructure/logging/logging.module.js';

@Module({})
export class AppModule {
  static register(
    config: AppConfig,
    logStream?: DestinationStream,
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
        LoggingModule.forRoot(config, logStream),
      ],
      controllers: [HealthController],
      providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
    };
  }
}
