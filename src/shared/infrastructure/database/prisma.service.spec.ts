import type { Actor } from '../../application/actor.js';
import type { AppConfig } from '../config/app-config.js';
import { PrismaService } from './prisma.service.js';
import { TenantIsolationError } from './tenant-scope.js';

describe('PrismaService', () => {
  const dummyConfig: AppConfig = {
    port: 3000,
    logLevel: 'info',
    auth: {
      issuerUrl: 'http://keycloak.test/realms/telemetry',
      audience: 'core-service',
    },
    database: {
      url: 'mysql://root:test@127.0.0.1:3307/core_test',
    },
  };

  let service: PrismaService;

  beforeEach(() => {
    service = new PrismaService(dummyConfig);
  });

  afterEach(async () => {
    await service.onApplicationShutdown();
  });

  describe('forActor', () => {
    it('AC-7: forActor throws TenantIsolationError for platform-operator', () => {
      const operator: Actor = {
        kind: 'platform-operator',
        userId: 'admin-user-id',
      };

      expect(() => service.forActor(operator)).toThrow(TenantIsolationError);
    });

    it('AC-7: forActor returns tenant client for tenant-user', () => {
      const user: Actor = {
        kind: 'tenant-user',
        userId: 'user-1',
        tenantId: 'tenant-456',
        roles: ['tenant-admin'],
      };

      const tenantClient = service.forActor(user);
      expect(tenantClient).toBeDefined();
    });
  });

  describe('forTenant', () => {
    it('returns an extended client for the specified tenantId', () => {
      const tenantClient = service.forTenant('tenant-123');
      expect(tenantClient).toBeDefined();
    });

    it('delegates to scopeArgs via $allOperations hook in $extends', () => {
      const extendsSpy = vi.spyOn(service.client, '$extends');
      service.forTenant('tenant-123');

      expect(extendsSpy).toHaveBeenCalledWith({
        query: {
          $allModels: {
            $allOperations: expect.any(Function),
          },
        },
      });

      const extensionArg = extendsSpy.mock.calls[0]?.[0] as {
        query: {
          $allModels: {
            $allOperations: (ctx: {
              model: string;
              operation: string;
              args: unknown;
              query: (args: unknown) => unknown;
            }) => unknown;
          };
        };
      };

      const allOperations = extensionArg.query.$allModels.$allOperations;
      const querySpy = vi.fn((args) => args);

      // Model without tenant scoping passes args directly
      allOperations({
        model: 'NonTenantModel',
        operation: 'findMany',
        args: { take: 10 },
        query: querySpy,
      });
      expect(querySpy).toHaveBeenCalledWith({ take: 10 });
    });
  });

  describe('ping', () => {
    it('returns false when database query fails or is unreachable', async () => {
      vi.spyOn(service.client, '$queryRaw').mockRejectedValueOnce(
        new Error('Connection refused'),
      );
      const reachable = await service.ping();
      expect(reachable).toBe(false);
    });

    it('returns true when query succeeds', async () => {
      vi.spyOn(service.client, '$queryRaw').mockResolvedValueOnce([
        { 1: 1 },
      ] as never);

      const reachable = await service.ping();
      expect(reachable).toBe(true);
    });
  });

  describe('onApplicationShutdown', () => {
    it('calls $disconnect on client', async () => {
      const disconnectSpy = vi
        .spyOn(service.client, '$disconnect')
        .mockResolvedValueOnce();

      await service.onApplicationShutdown();
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });
});
