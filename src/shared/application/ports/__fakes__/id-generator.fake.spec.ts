import { FakeIdGenerator } from './id-generator.fake.js';

describe('FakeIdGenerator', () => {
  it('AC-7: el fake de ids es secuencial y con formato UUID v7', () => {
    const generator = new FakeIdGenerator();
    const uuidV7Pattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

    const id1 = generator.next();
    const id2 = generator.next();
    const id3 = generator.next();

    expect(id1).toBe('00000000-0000-7000-8000-000000000001');
    expect(id2).toBe('00000000-0000-7000-8000-000000000002');
    expect(id3).toBe('00000000-0000-7000-8000-000000000003');

    expect(id1).toMatch(uuidV7Pattern);
    expect(id2).toMatch(uuidV7Pattern);
    expect(id3).toMatch(uuidV7Pattern);
  });
});
