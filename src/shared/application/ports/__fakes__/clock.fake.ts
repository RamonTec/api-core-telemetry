import type { ClockPort } from '../clock.port.js';

export class FakeClock implements ClockPort {
  private currentMs: number;

  constructor(initial: number | Date = 0) {
    this.currentMs = typeof initial === 'number' ? initial : initial.getTime();
  }

  set(ms: number): void {
    this.currentMs = ms;
  }

  setDate(d: Date): void {
    this.currentMs = d.getTime();
  }

  advance(ms: number): void {
    this.currentMs += ms;
  }

  now(): number {
    return this.currentMs;
  }

  nowDate(): Date {
    return new Date(this.currentMs);
  }
}
