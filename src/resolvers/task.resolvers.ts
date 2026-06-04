import type { Context } from '../context';
import { requireAuth, requireOwnerOrAdmin } from '../utils/authz';
import { notFoundError, badInputError } from '../utils/errors';
import { parseInput, createTaskSchema, updateTaskSchema } from '../utils/validation';

/** Load a task or throw NOT_FOUND. */
async function getTaskOrThrow(ctx: Context, id: string) {
  const task = await ctx.prisma.task.findUnique({ where: { id }, include: { project: true } });
  if (!task) throw notFoundError('Task not found');
  return task;
}

export const taskResolvers = {
  Query: {
    /** List tasks of a project (any authenticated user). */
    tasks: async (_p: unknown, args: { projectId: string }, ctx: Context) => {
      requireAuth(ctx);
      const project = await ctx.prisma.project.findUnique({ where: { id: args.projectId } });
      if (!project) throw notFoundError('Project not found');
      return ctx.prisma.task.findMany({ where: { projectId: args.projectId }, orderBy: { createdAt: 'asc' } });
    },

    /** Read a single task. */
    task: async (_p: unknown, args: { id: string }, ctx: Context) => {
      requireAuth(ctx);
      return getTaskOrThrow(ctx, args.id);
    },
  },

  Mutation: {
    /** Create a task under a project the user owns (or admin). */
    createTask: async (_p: unknown, args: { input: unknown }, ctx: Context) => {
      const user = requireAuth(ctx);
      const input = parseInput(createTaskSchema, args.input);

      const project = await ctx.prisma.project.findUnique({ where: { id: input.projectId } });
      if (!project) throw notFoundError('Project not found');
      requireOwnerOrAdmin(user, project.ownerId);

      if (input.assigneeId) {
        const assignee = await ctx.prisma.user.findUnique({ where: { id: input.assigneeId } });
        if (!assignee) throw badInputError('Assignee user not found');
      }

      return ctx.prisma.task.create({
        data: {
          title: input.title,
          status: input.status ?? 'TODO',
          projectId: input.projectId,
          assigneeId: input.assigneeId ?? null,
        },
      });
    },

    /** Update a task; only the parent project's owner or an admin may do so. */
    updateTask: async (_p: unknown, args: { id: string; input: unknown }, ctx: Context) => {
      const user = requireAuth(ctx);
      const input = parseInput(updateTaskSchema, args.input);

      const task = await getTaskOrThrow(ctx, args.id);
      requireOwnerOrAdmin(user, task.project.ownerId);

      if (input.assigneeId) {
        const assignee = await ctx.prisma.user.findUnique({ where: { id: input.assigneeId } });
        if (!assignee) throw badInputError('Assignee user not found');
      }

      return ctx.prisma.task.update({
        where: { id: args.id },
        data: {
          title: input.title ?? undefined,
          status: input.status ?? undefined,
          assigneeId: input.assigneeId === undefined ? undefined : input.assigneeId,
        },
      });
    },

    /** Delete a task; project owner or admin only. */
    deleteTask: async (_p: unknown, args: { id: string }, ctx: Context) => {
      const user = requireAuth(ctx);
      const task = await getTaskOrThrow(ctx, args.id);
      requireOwnerOrAdmin(user, task.project.ownerId);

      await ctx.prisma.task.delete({ where: { id: args.id } });
      return true;
    },
  },

  // Field resolvers.
  Task: {
    project: (parent: { projectId: string }, _a: unknown, ctx: Context) =>
      ctx.prisma.project.findUnique({ where: { id: parent.projectId } }),
    assignee: (parent: { assigneeId: string | null }, _a: unknown, ctx: Context) =>
      parent.assigneeId ? ctx.prisma.user.findUnique({ where: { id: parent.assigneeId } }) : null,
  },
};
