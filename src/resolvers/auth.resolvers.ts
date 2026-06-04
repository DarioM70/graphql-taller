import type { Context } from '../context';
import { hashPassword, verifyPassword } from '../auth/password';
import { signToken } from '../auth/jwt';
import { conflictError, badInputError, unauthenticatedError } from '../utils/errors';
import { parseInput, registerSchema, loginSchema } from '../utils/validation';

export const authResolvers = {
  Mutation: {
    /**
     * Public self-registration. The first user ever created becomes the
     * SUPERADMIN so the system is usable out of the box; everyone else is USER.
     */
    register: async (_p: unknown, args: { input: unknown }, ctx: Context) => {
      const input = parseInput(registerSchema, args.input);

      const existing = await ctx.prisma.user.findUnique({ where: { email: input.email } });
      if (existing) throw conflictError('A user with this email already exists');

      const userCount = await ctx.prisma.user.count();
      const role = userCount === 0 ? 'SUPERADMIN' : 'USER';

      const user = await ctx.prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: await hashPassword(input.password),
          role,
        },
      });

      const token = signToken({ userId: user.id, role: user.role });
      return { token, user };
    },

    /** Authenticate with email + password and return a signed JWT. */
    login: async (_p: unknown, args: { input: unknown }, ctx: Context) => {
      const input = parseInput(loginSchema, args.input);

      const user = await ctx.prisma.user.findUnique({ where: { email: input.email } });
      if (!user) throw unauthenticatedError('Invalid email or password');

      const ok = await verifyPassword(input.password, user.password);
      if (!ok) throw unauthenticatedError('Invalid email or password');

      const token = signToken({ userId: user.id, role: user.role });
      return { token, user };
    },
  },
};
