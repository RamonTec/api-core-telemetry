import { type OnApplicationBootstrap, Global, Module } from '@nestjs/common';
import { ReadinessRegistry } from '../health/readiness.registry.js';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule implements OnApplicationBootstrap {
  constructor(
    private readonly registry: ReadinessRegistry,
    private readonly prisma: PrismaService,
  ) {}

  onApplicationBootstrap(): void {
    this.registry.register('database', () => this.prisma.ping());
  }
}
