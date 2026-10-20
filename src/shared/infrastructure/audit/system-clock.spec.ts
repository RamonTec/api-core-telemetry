import { SystemClock } from './system-clock.js';

describe('SystemClock', () => {
  it('now() returns monotonic ms and nowDate() returns Date', () => {
    const clock = new SystemClock();
    const t1 = clock.now();
    const t2 = clock.now();
    expect(typeof t1).toBe('number');
    expect(t2).toBeGreaterThanOrEqual(t1);

    const d = clock.nowDate();
    expect(d).toBeInstanceOf(Date);
    expect(Math.abs(Date.now() - d.getTime())).toBeLessThan(1000);
  });
});
