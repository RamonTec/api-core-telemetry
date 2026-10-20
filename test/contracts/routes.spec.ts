import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import {
  DiscoveryModule,
  DiscoveryService,
  MetadataScanner,
  Reflector,
} from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { type Role } from '../../src/shared/application/actor.js';
import {
  PUBLIC_KEY,
  ROLES_KEY,
} from '../../src/shared/infrastructure/auth/auth.decorators.js';
import { loadDocument, OPENAPI_PATH } from '../support/contracts.js';
import { testConfig } from '../support/test-env.js';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

export interface ExposedRouteInfo {
  readonly method: string;
  readonly path: string;
  readonly routeKey: string;
  readonly isPublic: boolean;
  readonly roles: Role[];
}

function joinPath(...parts: string[]): string {
  const path = parts
    .flatMap((part) => part.split('/'))
    .filter((segment) => segment !== '')
    .map((segment) =>
      segment.startsWith(':') ? `{${segment.slice(1)}}` : segment,
    )
    .join('/');
  return `/${path}`;
}

export async function getExposedRoutes(): Promise<ExposedRouteInfo[]> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.register(testConfig()), DiscoveryModule],
  }).compile();

  const discovery = moduleRef.get(DiscoveryService);
  const scanner = moduleRef.get(MetadataScanner);
  const reflector = moduleRef.get(Reflector);
  const routes: ExposedRouteInfo[] = [];

  for (const wrapper of discovery.getControllers()) {
    const { instance, metatype } = wrapper;
    if (!instance || !metatype) continue;

    const prefix =
      (Reflect.getMetadata(PATH_METADATA, metatype) as string) ?? '';
    const prototype = Object.getPrototypeOf(instance) as object;

    for (const name of scanner.getAllMethodNames(prototype)) {
      const handler = (prototype as Record<string, unknown>)[name] as (
        ...args: unknown[]
      ) => unknown;
      const pathMetadata = Reflect.getMetadata(PATH_METADATA, handler) as
        string | string[] | undefined;
      if (pathMetadata === undefined) continue;

      const methodEnum = Reflect.getMetadata(
        METHOD_METADATA,
        handler,
      ) as RequestMethod;
      const httpMethod = RequestMethod[methodEnum].toUpperCase();

      const targets = [handler, metatype];
      const isPublic =
        reflector.getAllAndOverride<boolean | undefined>(
          PUBLIC_KEY,
          targets,
        ) === true;
      const roles =
        reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets) ??
        [];

      const rawPaths = Array.isArray(pathMetadata)
        ? pathMetadata
        : [pathMetadata];
      for (const p of rawPaths) {
        const fullPath = joinPath(prefix, p);
        routes.push({
          method: httpMethod,
          path: fullPath,
          routeKey: `${httpMethod} ${fullPath}`,
          isPublic,
          roles,
        });
      }
    }
  }

  await moduleRef.close();
  return routes;
}

export function getDocumentedRoutes(
  doc = loadDocument(OPENAPI_PATH),
): string[] {
  const paths = (doc['paths'] ?? {}) as Record<string, Record<string, unknown>>;
  return Object.entries(paths).flatMap(([path, item]) =>
    HTTP_METHODS.filter(
      (method) => item && typeof item === 'object' && method in item,
    ).map((method) => `${method.toUpperCase()} ${path}`),
  );
}

export function validateContractSecurityAndRoles(
  doc: Record<string, any>,
  exposedRoutes: ExposedRouteInfo[],
): { violations: string[] } {
  const violations: string[] = [];
  const paths = (doc['paths'] ?? {}) as Record<string, Record<string, any>>;

  for (const route of exposedRoutes) {
    const pathItem = paths[route.path];
    const operation = pathItem?.[route.method.toLowerCase()];
    if (!operation) {
      violations.push(`Missing documented operation for ${route.routeKey}`);
      continue;
    }

    if (route.isPublic) {
      if (
        !Array.isArray(operation.security) ||
        operation.security.length !== 0
      ) {
        violations.push(
          `Public operation ${route.routeKey} must declare security: [] in contract`,
        );
      }
    } else {
      const requiredRoles = operation['x-required-roles'];
      if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) {
        violations.push(
          `Non-public operation ${route.routeKey} must declare x-required-roles`,
        );
      } else {
        const sortedExpected = [...route.roles].sort((a, b) =>
          a.localeCompare(b),
        );
        const sortedActual = [...requiredRoles].sort((a, b) =>
          a.localeCompare(b),
        );
        if (JSON.stringify(sortedExpected) !== JSON.stringify(sortedActual)) {
          violations.push(
            `Operation ${route.routeKey} roles mismatch: expected [${sortedExpected.join(', ')}], got [${sortedActual.join(', ')}]`,
          );
        }
      }
    }
  }

  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      const isDocPublic =
        Array.isArray(operation.security) && operation.security.length === 0;
      if (!isDocPublic) {
        const requiredRoles = operation['x-required-roles'];
        if (!Array.isArray(requiredRoles) || requiredRoles.length === 0) {
          violations.push(
            `Documented non-public operation ${method.toUpperCase()} ${path} must declare x-required-roles`,
          );
        }
      }
    }
  }

  return { violations };
}

describe('OpenAPI routes and security contracts (spec 006)', () => {
  it('AC-3: every exposed route in code is documented and every documented route exists in code', async () => {
    const exposed = (await getExposedRoutes())
      .map((r) => r.routeKey)
      .sort((a, b) => a.localeCompare(b));
    const documented = getDocumentedRoutes().sort((a, b) => a.localeCompare(b));

    expect(exposed.length).toBeGreaterThan(0);
    expect(documented).toEqual(exposed);
  });

  it('AC-3: renaming a route in the YAML causes the route matching test to fail', async () => {
    const exposed = (await getExposedRoutes())
      .map((r) => r.routeKey)
      .sort((a, b) => a.localeCompare(b));
    const doc = structuredClone(loadDocument(OPENAPI_PATH)) as Record<
      string,
      any
    >;
    const [firstRoute] = Object.keys(doc.paths ?? {});
    expect(firstRoute).toBeDefined();
    doc.paths[`${firstRoute}-renamed`] = doc.paths[firstRoute!];
    delete doc.paths[firstRoute!];

    const documented = getDocumentedRoutes(doc).sort((a, b) =>
      a.localeCompare(b),
    );
    expect(documented).not.toEqual(exposed);
  });

  it('AC-4: every public route declares empty security and every protected route matches x-required-roles', async () => {
    const exposed = await getExposedRoutes();
    const doc = loadDocument(OPENAPI_PATH);
    const { violations } = validateContractSecurityAndRoles(doc, exposed);

    expect(violations).toEqual([]);
  });

  it('AC-4: a non-public operation without x-required-roles causes validation to fail', async () => {
    const exposed = await getExposedRoutes();
    const doc = structuredClone(loadDocument(OPENAPI_PATH)) as Record<
      string,
      any
    >;
    doc.paths['/dummy'] = {
      get: {
        operationId: 'getDummy',
        responses: { '200': { description: 'ok' } },
      },
    };

    const { violations } = validateContractSecurityAndRoles(doc, exposed);
    expect(violations).toContain(
      'Documented non-public operation GET /dummy must declare x-required-roles',
    );
  });

  it('AC-4: an exposed protected route with missing or mismatched x-required-roles causes validation to fail', () => {
    const fakeExposed: ExposedRouteInfo[] = [
      {
        method: 'POST',
        path: '/tenants',
        routeKey: 'POST /tenants',
        isPublic: false,
        roles: ['tenant-admin'],
      },
    ];
    const doc = {
      paths: {
        '/tenants': {
          post: {
            operationId: 'createTenant',
          },
        },
      },
    };

    const { violations } = validateContractSecurityAndRoles(doc, fakeExposed);
    expect(violations).toContain(
      'Non-public operation POST /tenants must declare x-required-roles',
    );
  });
});
