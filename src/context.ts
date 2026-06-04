import type { Request } from 'express';
import type { User } from '@prisma/client';
import { prisma } from './prisma';
import { verifyToken } from './auth/jwt';

/**
 * GraphQL execution context. `user` is the authenticated user resolved from
 * the `Authorization: Bearer <token>` header, or `null` for anonymous calls.
 */
export interface Context {
  user: User | null;
  prisma: typeof prisma;
}

/** Build the per-request context used by every resolver. */
export async function buildContext({ req }: { req: Request }): Promise<Context> {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  let user: User | null = null;
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      user = await prisma.user.findUnique({ where: { id: payload.userId } });
    }
  }

  return { user, prisma };
}
