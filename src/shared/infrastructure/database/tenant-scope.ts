export class TenantIsolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TenantIsolationError';
  }
}

function scopeRecord(
  record: unknown,
  tenantId: string,
): Record<string, unknown> {
  const rec = (record && typeof record === 'object' ? record : {}) as Record<
    string,
    unknown
  >;
  if (rec['tenantId'] !== undefined && rec['tenantId'] !== tenantId) {
    throw new TenantIsolationError(
      `Tenant mismatch: expected '${tenantId}', got '${typeof rec['tenantId'] === 'string' ? rec['tenantId'] : JSON.stringify(rec['tenantId'])}'`,
    );
  }
  return { ...rec, tenantId };
}

function scopeWhere(where: unknown, tenantId: string): Record<string, unknown> {
  const w = (where && typeof where === 'object' ? where : {}) as Record<
    string,
    unknown
  >;
  return { ...w, tenantId };
}

export function scopeArgs(
  operation: string,
  args: unknown,
  tenantId: string,
): unknown {
  const rawArgs = (args && typeof args === 'object' ? args : {}) as Record<
    string,
    unknown
  >;

  switch (operation) {
    case 'findUnique':
    case 'findUniqueOrThrow':
    case 'findFirst':
    case 'findFirstOrThrow':
    case 'findMany':
    case 'count':
    case 'aggregate':
    case 'groupBy':
    case 'delete':
    case 'deleteMany': {
      const where = scopeWhere(rawArgs['where'], tenantId);
      return { ...rawArgs, where };
    }
    case 'create': {
      const data = scopeRecord(rawArgs['data'], tenantId);
      return { ...rawArgs, data };
    }
    case 'createMany':
    case 'createManyAndReturn': {
      const rawData = rawArgs['data'];
      const data = Array.isArray(rawData)
        ? rawData.map((item) => scopeRecord(item, tenantId))
        : scopeRecord(rawData, tenantId);
      return { ...rawArgs, data };
    }
    case 'update':
    case 'updateMany': {
      const where = scopeWhere(rawArgs['where'], tenantId);
      const data = scopeRecord(rawArgs['data'], tenantId);
      return { ...rawArgs, where, data };
    }
    case 'upsert': {
      const where = scopeWhere(rawArgs['where'], tenantId);
      const create = scopeRecord(rawArgs['create'], tenantId);
      const update = scopeRecord(rawArgs['update'], tenantId);
      return { ...rawArgs, where, create, update };
    }
    default:
      throw new TenantIsolationError(
        `Unsupported operation '${operation}' in tenant scope`,
      );
  }
}

export function tenantScopedModels(
  prismaNamespace: { ModelName: Record<string, string> } & Record<
    string,
    unknown
  >,
): ReadonlySet<string> {
  const modelName = prismaNamespace?.ModelName;
  if (!modelName || typeof modelName !== 'object') {
    return new Set();
  }
  const models = Object.values(modelName).filter((model) => {
    const enumObj = prismaNamespace[`${model}ScalarFieldEnum`];
    return (
      enumObj !== null && typeof enumObj === 'object' && 'tenantId' in enumObj
    );
  });
  return new Set(models);
}
