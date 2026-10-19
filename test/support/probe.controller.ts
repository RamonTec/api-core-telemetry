import { Controller, Get } from '@nestjs/common';
import type { Actor } from '../../src/shared/application/actor.js';
import {
  CurrentActor,
  Public,
  Roles,
} from '../../src/shared/infrastructure/auth/auth.decorators.js';

@Controller('probe')
export class ProbeController {
  @Public()
  @Get('public')
  public(): { status: string } {
    return { status: 'public' };
  }

  @Roles('tenant-admin', 'tenant-operator')
  @Get('tenant')
  tenant(@CurrentActor() actor: Actor | undefined): Actor | undefined {
    return actor;
  }

  @Roles('platform-operator')
  @Get('platform')
  platform(@CurrentActor() actor: Actor | undefined): Actor | undefined {
    return actor;
  }

  @Get('unannotated')
  unannotated(@CurrentActor() actor: Actor | undefined): Actor | undefined {
    return actor;
  }
}
