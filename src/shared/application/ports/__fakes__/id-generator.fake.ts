import type { IdGeneratorPort } from '../id-generator.port.js';

export class FakeIdGenerator implements IdGeneratorPort {
  private counter: number;

  constructor(initialCounter = 1) {
    this.counter = initialCounter;
  }

  next(): string {
    const hex = (this.counter++).toString(16).padStart(12, '0');
    return `00000000-0000-7000-8000-${hex}`;
  }

  reset(counter = 1): void {
    this.counter = counter;
  }
}
