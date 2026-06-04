import type { User } from '@prisma/client';
import type { Context } from '../context';
import { unauthenticatedError, forbiddenError } from './errors';

/**
 * Authorization guards shared across resolvers. They throw typed GraphQL
 * errors so resolvers can stay focused on business logic.
 */

/** Ensure there is an authenticated user; returns it (never null). */
export function requireAuth(ctx: Context): User {
  if (!ctx.user) throw unauthenticatedError();
  return ctx.user;
}

/** Ensure the authenticated user has the SUPERADMIN role. */
export function requireSuperadmin(ctx: Context): User {
  const user = requireAuth(ctx);
  if (user.role !== 'SUPERADMIN') {
    throw forbiddenError('Only a superadmin can perform this action');
  }
  return user;
}

/** True when the user is the owner of the resource or a superadmin. */
export function isOwnerOrAdmin(user: User, ownerId: string): boolean {
  return user.role === 'SUPERADMIN' || user.id === ownerId;
}

/** Throw unless the user owns the resource or is a superadmin. */
export function requireOwnerOrAdmin(user: User, ownerId: string): void {
  if (!isOwnerOrAdmin(user, ownerId)) {
    throw forbiddenError('You can only manage your own resources');
  }
}
