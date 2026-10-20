import { UuidV7IdGenerator } from './uuid-v7-id-generator.js';

describe('UuidV7IdGenerator', () => {
  it('AC-7: next() cumple el formato v7 y dos ids consecutivos son crecientes', () => {
    const generator = new UuidV7IdGenerator();
    const uuidV7Pattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

    const id1 = generator.next();
    const id2 = generator.next();

    expect(id1).toMatch(uuidV7Pattern);
    expect(id2).toMatch(uuidV7Pattern);
    expect(id2 > id1).toBe(true);
  });
});
