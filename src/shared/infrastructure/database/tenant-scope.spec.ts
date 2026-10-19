import {
  scopeArgs,
  TenantIsolationError,
  tenantScopedModels,
} from './tenant-scope.js';

describe('tenant-scope', () => {
  const tenantId = 'tenant-123';

  describe('AC-5: scopeArgs operations table', () => {
    const whereCases: Array<{
      operation: string;
      inputArgs: Record<string, unknown> | undefined;
      expectedWhere: Record<string, unknown>;
    }> = [
      {
        operation: 'findUnique',
        inputArgs: { where: { id: 'uuid-1' } },
        expectedWhere: { id: 'uuid-1', tenantId },
      },
      {
        operation: 'findUniqueOrThrow',
        inputArgs: { where: { id: 'uuid-1' } },
        expectedWhere: { id: 'uuid-1', tenantId },
      },
      {
        operation: 'findFirst',
        inputArgs: { where: { status: 'active' } },
        expectedWhere: { status: 'active', tenantId },
      },
      {
        operation: 'findFirstOrThrow',
        inputArgs: { where: { status: 'active' } },
        expectedWhere: { status: 'active', tenantId },
      },
      {
        operation: 'findMany',
        inputArgs: { where: { type: 'gps' }, take: 10 },
        expectedWhere: { type: 'gps', tenantId },
      },
      {
        operation: 'count',
        inputArgs: { where: { active: true } },
        expectedWhere: { active: true, tenantId },
      },
      {
        operation: 'aggregate',
        inputArgs: { where: { deletedAt: null }, _count: true },
        expectedWhere: { deletedAt: null, tenantId },
      },
      {
        operation: 'groupBy',
        inputArgs: { by: ['status'], where: { valid: true } },
        expectedWhere: { valid: true, tenantId },
      },
      {
        operation: 'delete',
        inputArgs: { where: { id: 'uuid-1' } },
        expectedWhere: { id: 'uuid-1', tenantId },
      },
      {
        operation: 'deleteMany',
        inputArgs: { where: { status: 'archived' } },
        expectedWhere: { status: 'archived', tenantId },
      },
    ];

    it.each(whereCases)(
      'AC-5: sets tenantId in where for $operation',
      ({ operation, inputArgs, expectedWhere }) => {
        const result = scopeArgs(operation, inputArgs, tenantId) as Record<
          string,
          unknown
        >;
        expect(result.where).toEqual(expectedWhere);
        if (inputArgs) {
          for (const key of Object.keys(inputArgs)) {
            if (key !== 'where') {
              expect(result[key]).toEqual(inputArgs[key]);
            }
          }
        }
      },
    );

    it('AC-5: findMany with undefined args scopes where to tenantId', () => {
      const result = scopeArgs('findMany', undefined, tenantId) as Record<
        string,
        unknown
      >;
      expect(result).toEqual({ where: { tenantId } });
    });

    it('AC-5: sets tenantId in data for create', () => {
      const result = scopeArgs(
        'create',
        { data: { name: 'Vehicle 1' } },
        tenantId,
      ) as Record<string, unknown>;
      expect(result).toEqual({
        data: { name: 'Vehicle 1', tenantId },
      });
    });

    it('AC-5: sets tenantId in each item for createMany', () => {
      const result = scopeArgs(
        'createMany',
        { data: [{ name: 'V1' }, { name: 'V2' }] },
        tenantId,
      ) as Record<string, unknown>;
      expect(result).toEqual({
        data: [
          { name: 'V1', tenantId },
          { name: 'V2', tenantId },
        ],
      });
    });

    it('AC-5: sets tenantId in each item for createManyAndReturn', () => {
      const result = scopeArgs(
        'createManyAndReturn',
        { data: [{ name: 'V1' }] },
        tenantId,
      ) as Record<string, unknown>;
      expect(result).toEqual({
        data: [{ name: 'V1', tenantId }],
      });
    });

    it.each(['update', 'updateMany'])(
      'AC-5: sets tenantId in where and data for %s',
      (op) => {
        const result = scopeArgs(
          op,
          { where: { id: 'uuid-1' }, data: { name: 'Updated' } },
          tenantId,
        ) as Record<string, unknown>;
        expect(result).toEqual({
          where: { id: 'uuid-1', tenantId },
          data: { name: 'Updated', tenantId },
        });
      },
    );

    it('AC-5: sets tenantId in where, create and update for upsert', () => {
      const result = scopeArgs(
        'upsert',
        {
          where: { id: 'uuid-1' },
          create: { name: 'New' },
          update: { name: 'Updated' },
        },
        tenantId,
      ) as Record<string, unknown>;
      expect(result).toEqual({
        where: { id: 'uuid-1', tenantId },
        create: { name: 'New', tenantId },
        update: { name: 'Updated', tenantId },
      });
    });
  });

  describe('AC-6: TenantIsolationError and immutability', () => {
    it('AC-6: create with another tenantId throws TenantIsolationError', () => {
      expect(() =>
        scopeArgs('create', { data: { tenantId: 'other-tenant' } }, tenantId),
      ).toThrow(TenantIsolationError);
    });

    it('AC-6: create with matching tenantId succeeds', () => {
      expect(scopeArgs('create', { data: { tenantId } }, tenantId)).toEqual({
        data: { tenantId },
      });
    });

    it('AC-6: createMany with an item of another tenantId throws TenantIsolationError', () => {
      expect(() =>
        scopeArgs(
          'createMany',
          { data: [{ name: 'A' }, { tenantId: 'other-tenant' }] },
          tenantId,
        ),
      ).toThrow(TenantIsolationError);
    });

    it('AC-6: update with another tenantId in data throws TenantIsolationError', () => {
      expect(() =>
        scopeArgs(
          'update',
          { where: { id: '1' }, data: { tenantId: 'other-tenant' } },
          tenantId,
        ),
      ).toThrow(TenantIsolationError);
    });

    it('AC-6: upsert with another tenantId in create throws TenantIsolationError', () => {
      expect(() =>
        scopeArgs(
          'upsert',
          {
            where: { id: '1' },
            create: { tenantId: 'other-tenant' },
            update: { name: 'Ok' },
          },
          tenantId,
        ),
      ).toThrow(TenantIsolationError);
    });

    it('AC-6: upsert with another tenantId in update throws TenantIsolationError', () => {
      expect(() =>
        scopeArgs(
          'upsert',
          {
            where: { id: '1' },
            create: { name: 'Ok' },
            update: { tenantId: 'other-tenant' },
          },
          tenantId,
        ),
      ).toThrow(TenantIsolationError);
    });

    it.each(['queryRaw', 'executeRaw', '$queryRaw', 'unknownOp', ''])(
      'AC-6: unknown operation %s throws TenantIsolationError (fail closed)',
      (unknownOp) => {
        expect(() => scopeArgs(unknownOp, {}, tenantId)).toThrow(
          TenantIsolationError,
        );
      },
    );

    it('AC-6: input args object is not mutated', () => {
      const input = Object.freeze({
        where: Object.freeze({ id: 'uuid-1', status: 'active' }),
        data: Object.freeze({ name: 'Old' }),
      });
      const result = scopeArgs('update', input, tenantId) as Record<
        string,
        unknown
      >;

      expect(result).not.toBe(input);
      expect(result.where).not.toBe(input.where);
      expect(result.data).not.toBe(input.data);
      expect(input.where).toEqual({ id: 'uuid-1', status: 'active' });
      expect(input.data).toEqual({ name: 'Old' });
    });
  });

  describe('tenantScopedModels', () => {
    it('returns only models that have tenantId in their ScalarFieldEnum', () => {
      const fakePrisma = {
        ModelName: {
          Tenant: 'Tenant',
          User: 'User',
          Vehicle: 'Vehicle',
          AuditLog: 'AuditLog',
        },
        TenantScalarFieldEnum: { id: 'id', name: 'name' },
        UserScalarFieldEnum: {
          id: 'id',
          email: 'email',
          tenantId: 'tenantId',
        },
        VehicleScalarFieldEnum: {
          id: 'id',
          vin: 'vin',
          tenantId: 'tenantId',
        },
        AuditLogScalarFieldEnum: { id: 'id', action: 'action' },
      };

      const scoped = tenantScopedModels(fakePrisma);
      expect(scoped).toEqual(new Set(['User', 'Vehicle']));
    });

    it('returns empty set if no models have tenantId or ModelName is empty', () => {
      const fakePrisma = {
        ModelName: {
          SystemConfig: 'SystemConfig',
        },
        SystemConfigScalarFieldEnum: { key: 'key', value: 'value' },
      };

      const scoped = tenantScopedModels(fakePrisma);
      expect(scoped).toEqual(new Set());
    });
  });
});
