import { Test } from '@nestjs/testing';
import { AUDIT_LOG_PORT } from '../../application/ports/audit-log.port.js';
import { CLOCK_PORT } from '../../application/ports/clock.port.js';
import { ID_GENERATOR_PORT } from '../../application/ports/id-generator.port.js';
import { AuditModule } from './audit.module.js';
import { PinoAuditLogAdapter } from './pino-audit-log.adapter.js';
import { SystemClock } from './system-clock.js';
import { UuidV7IdGenerator } from './uuid-v7-id-generator.js';

describe('AuditModule', () => {
  it('provides and exports all 3 ports globally', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuditModule],
    }).compile();

    expect(moduleRef.get(AUDIT_LOG_PORT)).toBeInstanceOf(PinoAuditLogAdapter);
    expect(moduleRef.get(CLOCK_PORT)).toBeInstanceOf(SystemClock);
    expect(moduleRef.get(ID_GENERATOR_PORT)).toBeInstanceOf(UuidV7IdGenerator);
  });
});
