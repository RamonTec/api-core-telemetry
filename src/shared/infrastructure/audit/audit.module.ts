import { Global, Module } from '@nestjs/common';
import { AUDIT_LOG_PORT } from '../../application/ports/audit-log.port.js';
import { CLOCK_PORT } from '../../application/ports/clock.port.js';
import { ID_GENERATOR_PORT } from '../../application/ports/id-generator.port.js';
import { PinoAuditLogAdapter } from './pino-audit-log.adapter.js';
import { SystemClock } from './system-clock.js';
import { UuidV7IdGenerator } from './uuid-v7-id-generator.js';

@Global()
@Module({
  providers: [
    { provide: AUDIT_LOG_PORT, useClass: PinoAuditLogAdapter },
    { provide: CLOCK_PORT, useClass: SystemClock },
    { provide: ID_GENERATOR_PORT, useClass: UuidV7IdGenerator },
  ],
  exports: [AUDIT_LOG_PORT, CLOCK_PORT, ID_GENERATOR_PORT],
})
export class AuditModule {}
