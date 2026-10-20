import { validate } from '@readme/openapi-parser';
import {
  loadDocument,
  OPENAPI_PATH,
  validateAgainst,
} from '../support/contracts.js';

describe('Published contract documents (spec 006)', () => {
  it('AC-1: openapi.yaml contains health, ready, ErrorBody and keycloak security scheme with x-audience and x-tenant-claim', () => {
    const doc = loadDocument(OPENAPI_PATH) as Record<string, any>;

    expect(doc.paths?.['/health']?.get).toBeDefined();
    expect(doc.paths?.['/health/ready']?.get).toBeDefined();
    expect(doc.components?.schemas?.ErrorBody).toBeDefined();
    expect(doc.components?.schemas?.Readiness).toBeDefined();

    const keycloak = doc.components?.securitySchemes?.keycloak;
    expect(keycloak).toBeDefined();
    expect(keycloak?.['x-audience']).toBe('core-service');
    expect(keycloak?.['x-tenant-claim']).toBe('tenant_id');
  });

  it('AC-1: validateAgainst validates ErrorBody and Readiness against openapi.yaml schemas', () => {
    const validError = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      correlationId: 'req-123',
    };
    expect(
      validateAgainst(
        OPENAPI_PATH,
        '/components/schemas/ErrorBody',
        validError,
      ),
    ).toBeNull();

    const invalidError = {
      code: 'VALIDATION_ERROR',
    };
    const errorViolation = validateAgainst(
      OPENAPI_PATH,
      '/components/schemas/ErrorBody',
      invalidError,
    );
    expect(errorViolation).not.toBeNull();

    const validReadiness = {
      status: 'ok',
      checks: { database: 'ok' },
    };
    expect(
      validateAgainst(
        OPENAPI_PATH,
        '/components/schemas/Readiness',
        validReadiness,
      ),
    ).toBeNull();
  });

  it('AC-2: openapi.yaml is a valid OpenAPI 3.1 document', async () => {
    const doc = structuredClone(loadDocument(OPENAPI_PATH));

    const result = await validate(doc as Parameters<typeof validate>[0]);

    expect(result.valid ? [] : result.errors).toEqual([]);
    expect(doc.openapi).toBe('3.1.0');
  });

  it('AC-2: deliberately breaking the OpenAPI document causes validation to fail', async () => {
    const brokenDoc = structuredClone(loadDocument(OPENAPI_PATH)) as Record<
      string,
      any
    >;
    delete brokenDoc.openapi;
    delete brokenDoc.info;

    const result = await validate(brokenDoc as Parameters<typeof validate>[0]);
    expect(result.valid).toBe(false);
  });
});
