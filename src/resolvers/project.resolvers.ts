import type { Context } from '../context';
import { requireAuth, requireOwnerOrAdmin } from '../utils/authz';
import { notFoundError } from '../utils/errors';
import { parseInput, createProjectSchema, updateProjectSchema } from '../utils/validation';

export const projectResolvers = {
  Query: {
    /**
     * List projects. A superadmin sees every project; a regular user sees only
     * their own. `mine: true` forces own-projects even for a superadmin.
     */
    projects: (_p: unknown, args: { mine?: boolean }, ctx: Context) => {
      const user = requireAuth(ctx);
      const onlyMine = args.mine === true || user.role !== 'SUPERADMIN';
      return ctx.prisma.project.findMany({
        where: onlyMine ? { ownerId: user.id } : undefined,
        orderBy: { createdAt: 'asc' },
      });
    },

    /** Read a single project (any authenticated user can read). */
    project: async (_p: unknown, args: { id: string }, ctx: Context) => {
      requireAuth(ctx);
      const project = await ctx.prisma.project.findUnique({ where: { id: args.id } });
      if (!project) throw notFoundError('Project not found');
      return project;
    },
  },

  Mutation: {
    /** Any authenticated user creates a project owned by themselves. */
    createProject: (_p: unknown, args: { input: unknown }, ctx: Context) => {
      const user = requireAuth(ctx);
      const input = parseInput(createProjectSchema, args.input);
      return ctx.prisma.project.create({
        data: { name: input.name, description: input.description, ownerId: user.id },
      });
    },

    /** Owner or admin can update a project. */
    updateProject: async (_p: unknown, args: { id: string; input: unknown }, ctx: Context) => {
      const user = requireAuth(ctx);
      const input = parseInput(updateProjectSchema, args.input);

      const project = await ctx.prisma.project.findUnique({ where: { id: args.id } });
      if (!project) throw notFoundError('Project not found');
      requireOwnerOrAdmin(user, project.ownerId);

      return ctx.prisma.project.update({
        where: { id: args.id },
        data: {
          name: input.name ?? undefined,
          description: input.description === undefined ? undefined : input.description,
        },
      });
    },

    /** Owner or admin can delete a project (cascades to tasks/comments). */
    deleteProject: async (_p: unknown, args: { id: string }, ctx: Context) => {
      const user = requireAuth(ctx);
      const project = await ctx.prisma.project.findUnique({ where: { id: args.id } });
      if (!project) throw notFoundError('Project not found');
      requireOwnerOrAdmin(user, project.ownerId);

      await ctx.prisma.project.delete({ where: { id: args.id } });
      return true;
    },
  },

  // Field resolvers for relations.
  Project: {
    owner: (parent: { ownerId: string }, _a: unknown, ctx: Context) =>
      ctx.prisma.user.findUnique({ where: { id: parent.ownerId } }),
    tasks: (parent: { id: string }, _a: unknown, ctx: Context) =>
      ctx.prisma.task.findMany({ where: { projectId: parent.id }, orderBy: { createdAt: 'asc' } }),
    comments: (parent: { id: string }, _a: unknown, ctx: Context) =>
      ctx.prisma.comment.findMany({ where: { projectId: parent.id }, orderBy: { createdAt: 'asc' } }),
  },
};
