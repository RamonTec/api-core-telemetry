import {
  type Actor,
  TENANT_ROLES,
  type TenantRole,
} from '../../application/actor.js';

export interface VerifiedClaims {
  readonly sub: string;
  readonly tenantId: string | undefined;
  readonly clientRoles: readonly string[];
  readonly realmRoles: readonly string[];
}

export type ActorRejection =
  | 'TENANT_ROLE_WITHOUT_TENANT'
  | 'INVALID_TENANT_ID'
  | 'OPERATOR_WITH_TENANT'
  | 'NO_KNOWN_ROLE';

export class ActorRejectedError extends Error {
  constructor(readonly reason: ActorRejection) {
    super(`Actor rejected: ${reason}`);
    this.name = 'ActorRejectedError';
  }
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function actorFromClaims(claims: VerifiedClaims): Actor {
  const isOperator = claims.realmRoles.includes('platform-operator');
  const tenantRoles: TenantRole[] = TENANT_ROLES.filter((role) =>
    claims.clientRoles.includes(role),
  );

  if (isOperator) {
    if (claims.tenantId !== undefined || tenantRoles.length > 0) {
      throw new ActorRejectedError('OPERATOR_WITH_TENANT');
    }
    return {
      kind: 'platform-operator',
      userId: claims.sub,
    };
  }

  if (tenantRoles.length === 0) {
    throw new ActorRejectedError('NO_KNOWN_ROLE');
  }

  if (claims.tenantId === undefined) {
    throw new ActorRejectedError('TENANT_ROLE_WITHOUT_TENANT');
  }

  if (!isValidUuid(claims.tenantId)) {
    throw new ActorRejectedError('INVALID_TENANT_ID');
  }

  return {
    kind: 'tenant-user',
    userId: claims.sub,
    tenantId: claims.tenantId,
    roles: tenantRoles,
  };
}
