import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Actor, Role } from '../../application/actor.js';
import { UpstreamUnavailableError } from '../../domain/upstream-unavailable.error.js';
import {
  actorFromClaims,
  ActorRejectedError,
  type VerifiedClaims,
} from './actor-from-claims.js';
import {
  type AuthenticatedRequest,
  PUBLIC_KEY,
  ROLES_KEY,
} from './auth.decorators.js';
import { InvalidTokenError, JwtVerifier } from './jwt-verifier.js';

const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;

@Injectable()
export class UserAuthGuard implements CanActivate {
  private readonly logger = new Logger(UserAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: JwtVerifier,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];

    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      PUBLIC_KEY,
      targets,
    );
    if (isPublic === true) {
      return true;
    }

    const declaredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      targets,
    );
    if (declaredRoles === undefined || declaredRoles.length === 0) {
      throw new ForbiddenException();
    }

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const match = BEARER_PATTERN.exec(req.headers.authorization ?? '');
    const token = match?.[1];
    if (token === undefined) {
      throw new UnauthorizedException();
    }

    let claims: VerifiedClaims;
    try {
      claims = await this.verifier.verify(token);
    } catch (err: unknown) {
      if (err instanceof InvalidTokenError) {
        if (err.reason === 'JWKS_UNAVAILABLE') {
          throw new UpstreamUnavailableError('keycloak');
        }
        this.logger.warn(
          { reason: err.reason, msg: 'Rejected user token' },
          'Rejected user token',
        );
        throw new UnauthorizedException();
      }
      throw err;
    }

    let actor: Actor;
    try {
      actor = actorFromClaims(claims);
    } catch (err: unknown) {
      if (err instanceof ActorRejectedError) {
        this.logger.warn(
          { reason: err.reason, msg: 'Actor rejected' },
          `Actor rejected: ${err.reason}`,
        );
        throw new ForbiddenException();
      }
      throw err;
    }

    const hasRole =
      actor.kind === 'platform-operator'
        ? declaredRoles.includes('platform-operator')
        : actor.roles.some((r) => declaredRoles.includes(r));

    if (!hasRole) {
      throw new ForbiddenException();
    }

    req.actor = actor;
    return true;
  }
}
