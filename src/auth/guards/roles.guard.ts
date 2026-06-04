import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';
import { ValidRoles } from '../enums/valid-roles.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Authorizes a request only if the authenticated user holds at least one of the
 * roles declared with @Roles(). Must run after GqlAuthGuard (which sets req.user).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<ValidRoles[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const ctx = GqlExecutionContext.create(context);
    const user: User | undefined = ctx.getContext().req?.user;
    if (!user) throw new ForbiddenException('No authenticated user found');

    const hasRole = user.roles.some((role) => requiredRoles.includes(role as ValidRoles));
    if (!hasRole) {
      throw new ForbiddenException(
        `User needs one of these roles: [${requiredRoles.join(', ')}]`,
      );
    }
    return true;
  }
}
