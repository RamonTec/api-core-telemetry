import {
  actorFromClaims,
  ActorRejectedError,
  type VerifiedClaims,
} from './actor-from-claims.js';

describe('actorFromClaims', () => {
  const validTenantId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

  describe('AC-4: tenant user actor', () => {
    it('AC-4: builds a tenant-user actor filtering out unknown client roles', () => {
      const claims: VerifiedClaims = {
        sub: 'user-123',
        tenantId: validTenantId,
        clientRoles: ['tenant-admin', 'otro'],
        realmRoles: [],
      };

      const actor = actorFromClaims(claims);

      expect(actor).toEqual({
        kind: 'tenant-user',
        userId: 'user-123',
        tenantId: validTenantId,
        roles: ['tenant-admin'],
      });
    });

    it('AC-4: preserves the order of TENANT_ROLES regardless of clientRoles order', () => {
      const claims: VerifiedClaims = {
        sub: 'user-456',
        tenantId: validTenantId,
        clientRoles: ['driver', 'tenant-viewer', 'tenant-admin'],
        realmRoles: [],
      };

      const actor = actorFromClaims(claims);

      expect(actor).toEqual({
        kind: 'tenant-user',
        userId: 'user-456',
        tenantId: validTenantId,
        roles: ['tenant-admin', 'tenant-viewer', 'driver'],
      });
    });
  });

  describe('AC-5: platform operator actor', () => {
    it('AC-5: builds a platform-operator actor when realmRoles includes platform-operator and no tenant is present', () => {
      const claims: VerifiedClaims = {
        sub: 'admin-001',
        tenantId: undefined,
        clientRoles: [],
        realmRoles: ['platform-operator', 'default-roles-telemetry'],
      };

      const actor = actorFromClaims(claims);

      expect(actor).toEqual({
        kind: 'platform-operator',
        userId: 'admin-001',
      });
    });
  });

  describe('AC-6: ActorRejection reasons', () => {
    it('AC-6: rejects with NO_KNOWN_ROLE when no recognized roles exist', () => {
      const claims: VerifiedClaims = {
        sub: 'user-no-role',
        tenantId: validTenantId,
        clientRoles: ['unknown-role'],
        realmRoles: ['other-realm-role'],
      };

      expect(() => actorFromClaims(claims)).toThrow(ActorRejectedError);
      try {
        actorFromClaims(claims);
      } catch (err) {
        expect(err).toBeInstanceOf(ActorRejectedError);
        expect((err as ActorRejectedError).reason).toBe('NO_KNOWN_ROLE');
      }
    });

    it('AC-6: rejects with TENANT_ROLE_WITHOUT_TENANT when tenant role exists but tenantId is missing', () => {
      const claims: VerifiedClaims = {
        sub: 'user-no-tenant',
        tenantId: undefined,
        clientRoles: ['tenant-operator'],
        realmRoles: [],
      };

      expect(() => actorFromClaims(claims)).toThrow(ActorRejectedError);
      try {
        actorFromClaims(claims);
      } catch (err) {
        expect(err).toBeInstanceOf(ActorRejectedError);
        expect((err as ActorRejectedError).reason).toBe(
          'TENANT_ROLE_WITHOUT_TENANT',
        );
      }
    });

    it('AC-6: rejects with INVALID_TENANT_ID when tenantId is not a valid UUID', () => {
      const claims: VerifiedClaims = {
        sub: 'user-bad-uuid',
        tenantId: 'not-a-valid-uuid',
        clientRoles: ['tenant-viewer'],
        realmRoles: [],
      };

      expect(() => actorFromClaims(claims)).toThrow(ActorRejectedError);
      try {
        actorFromClaims(claims);
      } catch (err) {
        expect(err).toBeInstanceOf(ActorRejectedError);
        expect((err as ActorRejectedError).reason).toBe('INVALID_TENANT_ID');
      }
    });

    it('AC-6: rejects with OPERATOR_WITH_TENANT when platform-operator has tenantId', () => {
      const claims: VerifiedClaims = {
        sub: 'operator-with-tenant',
        tenantId: validTenantId,
        clientRoles: [],
        realmRoles: ['platform-operator'],
      };

      expect(() => actorFromClaims(claims)).toThrow(ActorRejectedError);
      try {
        actorFromClaims(claims);
      } catch (err) {
        expect(err).toBeInstanceOf(ActorRejectedError);
        expect((err as ActorRejectedError).reason).toBe('OPERATOR_WITH_TENANT');
      }
    });

    it('AC-6: rejects with OPERATOR_WITH_TENANT when platform-operator has tenant roles', () => {
      const claims: VerifiedClaims = {
        sub: 'operator-with-tenant-roles',
        tenantId: undefined,
        clientRoles: ['tenant-admin'],
        realmRoles: ['platform-operator'],
      };

      expect(() => actorFromClaims(claims)).toThrow(ActorRejectedError);
      try {
        actorFromClaims(claims);
      } catch (err) {
        expect(err).toBeInstanceOf(ActorRejectedError);
        expect((err as ActorRejectedError).reason).toBe('OPERATOR_WITH_TENANT');
      }
    });
  });
});
