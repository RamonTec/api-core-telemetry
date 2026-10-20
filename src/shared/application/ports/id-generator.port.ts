export const ID_GENERATOR_PORT = Symbol('IdGeneratorPort');

export interface IdGeneratorPort {
  next(): string;
}
