import type { Context } from '../context';
import { hashPassword } from '../auth/password';
import { requireAuth, requireSuperadmin } from '../utils/authz';
import { notFoundError, conflictError } from '../utils/errors';
import { parseInput, createUserSchema, updateUserSchema } from '../utils/validation';

export const userResolvers = {
  Query: {
    /** The currently authenticated user. */
    me: (_p: unknown, _a: unknown, ctx: Context) => requireAuth(ctx),

    /** Any authenticated user can list users. */
    users: (_p: unknown, _a: unknown, ctx: Context) => {
      requireAuth(ctx);
      return ctx.prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
    },

    /** Any authenticated user can fetch a single user. */
    user: async (_p: unknown, args: { id: string }, ctx: Context) => {
      requireAuth(ctx);
      const user = await ctx.prisma.user.findUnique({ where: { id: args.id } });
      if (!user) throw notFoundError('User not found');
      return user;
    },
  },

  Mutation: {
    /** Superadmin only: create a user with an explicit role. */
    createUser: async (_p: unknown, args: { input: unknown }, ctx: Context) => {
      requireSuperadmin(ctx);
      const input = parseInput(createUserSchema, args.input);

      const existing = await ctx.prisma.user.findUnique({ where: { email: input.email } });
      if (existing) throw conflictError('A user with this email already exists');

      return ctx.prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: await hashPassword(input.password),
          role: input.role ?? 'USER',
        },
      });
    },

    /** Superadmin only: update any user. */
    updateUser: async (_p: unknown, args: { id: string; input: unknown }, ctx: Context) => {
      requireSuperadmin(ctx);
      const input = parseInput(updateUserSchema, args.input);

      const target = await ctx.prisma.user.findUnique({ where: { id: args.id } });
      if (!target) throw notFoundError('User not found');

      if (input.email && input.email !== target.email) {
        const clash = await ctx.prisma.user.findUnique({ where: { email: input.email } });
        if (clash) throw conflictError('A user with this email already exists');
      }

      return ctx.prisma.user.update({
        where: { id: args.id },
        data: {
          name: input.name ?? undefined,
          email: input.email ?? undefined,
          role: input.role ?? undefined,
          password: input.password ? await hashPassword(input.password) : undefined,
        },
      });
    },

    /** Superadmin only: delete a user (cannot delete self). */
    deleteUser: async (_p: unknown, args: { id: string }, ctx: Context) => {
      const admin = requireSuperadmin(ctx);
      if (admin.id === args.id) {
        throw conflictError('You cannot delete your own account');
      }

      const target = await ctx.prisma.user.findUnique({ where: { id: args.id } });
      if (!target) throw notFoundError('User not found');

      await ctx.prisma.user.delete({ where: { id: args.id } });
      return true;
    },
  },

  // Field resolver: a user's owned projects.
  User: {
    projects: (parent: { id: string }, _a: unknown, ctx: Context) =>
      ctx.prisma.project.findMany({ where: { ownerId: parent.id }, orderBy: { createdAt: 'asc' } }),
  },
};
