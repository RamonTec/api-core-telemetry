import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import type { Actor } from '../../application/actor.js';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { Prisma, PrismaClient } from './generated/client.js';
import {
  scopeArgs,
  TenantIsolationError,
  tenantScopedModels,
} from './tenant-scope.js';

@Injectable()
export class PrismaService implements OnApplicationShutdown {
  readonly client: PrismaClient;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const adapter = new PrismaMariaDb(config.database.url);
    this.client = new PrismaClient({ adapter });
  }

  forTenant(tenantId: string) {
    const scoped = tenantScopedModels(Prisma);
    return this.client.$extends({
      query: {
        $allModels: {
          $allOperations({ model, operation, args, query }) {
            const execute = query as (modifiedArgs: unknown) => Promise<never>;
            return scoped.has(model)
              ? execute(scopeArgs(operation, args, tenantId))
              : execute(args);
          },
        },
      },
    });
  }

  forActor(actor: Actor): TenantClient {
    if (actor.kind !== 'tenant-user') {
      throw new TenantIsolationError(
        `Cannot create tenant client for actor kind '${actor.kind}'`,
      );
    }
    return this.forTenant(actor.tenantId);
  }

  async ping(): Promise<boolean> {
    try {
      await Promise.race([
        this.client.$queryRaw`SELECT 1`,
        new Promise<never>((_, reject) => {
          const timer = setTimeout(
            () => reject(new Error('Database ping timed out')),
            2000,
          );
          timer.unref?.();
        }),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.$disconnect();
  }
}

export type TenantClient = ReturnType<PrismaService['forTenant']>;
