import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Actor, Role } from '../../application/actor.js';

export const PUBLIC_KEY = 'auth:public';
export const ROLES_KEY = 'auth:roles';

export interface AuthenticatedRequest extends Request {
  actor?: Actor;
}

export const Public = () => SetMetadata(PUBLIC_KEY, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Actor | undefined => {
    return ctx.switchToHttp().getRequest<AuthenticatedRequest>().actor;
  },
);
