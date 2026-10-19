import { type DynamicModule, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import type { AuthConfig } from '../config/app-config.js';
import { JwtVerifier } from './jwt-verifier.js';
import { UserAuthGuard } from './user-auth.guard.js';

@Module({})
export class AuthModule {
  static forRoot(
    config: AuthConfig,
    overrides?: { jwtVerifier?: JwtVerifier },
  ): DynamicModule {
    const verifierProvider = overrides?.jwtVerifier
      ? { provide: JwtVerifier, useValue: overrides.jwtVerifier }
      : {
          provide: JwtVerifier,
          useFactory: () => new JwtVerifier(config),
        };

    return {
      module: AuthModule,
      providers: [
        verifierProvider,
        {
          provide: APP_GUARD,
          useClass: UserAuthGuard,
        },
      ],
      exports: [JwtVerifier],
    };
  }
}
