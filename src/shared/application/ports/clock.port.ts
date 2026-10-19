export const CLOCK_PORT = Symbol('ClockPort');

export interface ClockPort {
  now(): number;
  nowDate(): Date;
}
