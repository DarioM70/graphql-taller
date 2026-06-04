import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';

/**
 * Injects the authenticated User into a resolver argument. Requires GqlAuthGuard
 * to have populated req.user beforehand.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): User => {
    const ctx = GqlExecutionContext.create(context);
    const user: User | undefined = ctx.getContext().req?.user;
    if (!user) {
      throw new InternalServerErrorException(
        'No user found in request — is GqlAuthGuard applied?',
      );
    }
    return user;
  },
);
