import { FakeClock } from './clock.fake.js';

describe('FakeClock', () => {
  it('returns current time, allows setting and advancing time deterministically', () => {
    const clock = new FakeClock(1_000);
    expect(clock.now()).toBe(1_000);
    expect(clock.nowDate()).toEqual(new Date(1_000));

    clock.advance(500);
    expect(clock.now()).toBe(1_500);
    expect(clock.nowDate()).toEqual(new Date(1_500));

    clock.set(3_000);
    expect(clock.now()).toBe(3_000);

    clock.setDate(new Date(5_000));
    expect(clock.now()).toBe(5_000);
    expect(clock.nowDate()).toEqual(new Date(5_000));
  });

  it('defaults to 0 when no initial time is provided', () => {
    const clock = new FakeClock();
    expect(clock.now()).toBe(0);
    expect(clock.nowDate()).toEqual(new Date(0));
  });

  it('accepts Date in constructor', () => {
    const d = new Date('2026-01-01T00:00:00.000Z');
    const clock = new FakeClock(d);
    expect(clock.now()).toBe(d.getTime());
    expect(clock.nowDate()).toEqual(d);
  });
});
