export const TENANT_ROLES = [
  'tenant-admin',
  'tenant-operator',
  'tenant-viewer',
  'driver',
] as const;

export type TenantRole = (typeof TENANT_ROLES)[number];

export type Role = TenantRole | 'platform-operator';

export type Actor =
  | {
      readonly kind: 'tenant-user';
      readonly userId: string;
      readonly tenantId: string;
      readonly roles: readonly TenantRole[];
    }
  | {
      readonly kind: 'platform-operator';
      readonly userId: string;
    };
