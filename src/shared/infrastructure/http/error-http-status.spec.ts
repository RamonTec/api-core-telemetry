import {
  codeForHttpStatus,
  ERROR_HTTP_STATUS,
  GENERIC_ERROR_HTTP_STATUS,
  httpStatusForCode,
} from './error-http-status.js';

const genericEntries = Object.entries(GENERIC_ERROR_HTTP_STATUS);

describe('error-http-status', () => {
  describe('httpStatusForCode', () => {
    it.each(genericEntries)('AC-8: maps %s to %i', (code, status) => {
      expect(httpStatusForCode(code)).toBe(status);
    });

    it('AC-8: returns undefined for an unknown code', () => {
      expect(httpStatusForCode('SOMETHING_UNKNOWN')).toBeUndefined();
    });

    it('AC-8: returns undefined for inherited Object properties like constructor or toString', () => {
      expect(httpStatusForCode('constructor')).toBeUndefined();
      expect(httpStatusForCode('toString')).toBeUndefined();
      expect(httpStatusForCode('valueOf')).toBeUndefined();
    });

    it('AC-8: ERROR_HTTP_STATUS contains only generic error codes', () => {
      expect(ERROR_HTTP_STATUS).toEqual(GENERIC_ERROR_HTTP_STATUS);
    });
  });

  describe('codeForHttpStatus', () => {
    it.each(genericEntries)(
      'AC-8: maps status %i back to %s',
      (code, status) => {
        expect(codeForHttpStatus(status)).toBe(code);
      },
    );

    it.each([400, 401, 403, 404, 409, 500, 503])(
      'AC-8: codeForHttpStatus is the inverse of httpStatusForCode for status %i',
      (status) => {
        const code = codeForHttpStatus(status);
        expect(httpStatusForCode(code)).toBe(status);
      },
    );

    it.each([405, 413, 422])(
      'AC-8: maps unmapped 4xx status %i to BAD_REQUEST',
      (status) => {
        expect(codeForHttpStatus(status)).toBe('BAD_REQUEST');
      },
    );

    it.each([502, 504])(
      'AC-8: maps unmapped 5xx status %i to INTERNAL_ERROR',
      (status) => {
        expect(codeForHttpStatus(status)).toBe('INTERNAL_ERROR');
      },
    );
  });
});
