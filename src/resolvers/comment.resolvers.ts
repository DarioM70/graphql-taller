import type { Context } from '../context';
import { requireAuth, requireOwnerOrAdmin } from '../utils/authz';
import { notFoundError } from '../utils/errors';
import { parseInput, createCommentSchema, updateCommentSchema } from '../utils/validation';

export const commentResolvers = {
  Query: {
    /** List comments of a project (any authenticated user). */
    comments: async (_p: unknown, args: { projectId: string }, ctx: Context) => {
      requireAuth(ctx);
      const project = await ctx.prisma.project.findUnique({ where: { id: args.projectId } });
      if (!project) throw notFoundError('Project not found');
      return ctx.prisma.comment.findMany({ where: { projectId: args.projectId }, orderBy: { createdAt: 'asc' } });
    },
  },

  Mutation: {
    /** Any authenticated user can comment on an existing project. */
    createComment: async (_p: unknown, args: { input: unknown }, ctx: Context) => {
      const user = requireAuth(ctx);
      const input = parseInput(createCommentSchema, args.input);

      const project = await ctx.prisma.project.findUnique({ where: { id: input.projectId } });
      if (!project) throw notFoundError('Project not found');

      return ctx.prisma.comment.create({
        data: { content: input.content, projectId: input.projectId, authorId: user.id },
      });
    },

    /** Update a comment; author or admin only. */
    updateComment: async (_p: unknown, args: { id: string; input: unknown }, ctx: Context) => {
      const user = requireAuth(ctx);
      const input = parseInput(updateCommentSchema, args.input);

      const comment = await ctx.prisma.comment.findUnique({ where: { id: args.id } });
      if (!comment) throw notFoundError('Comment not found');
      requireOwnerOrAdmin(user, comment.authorId);

      return ctx.prisma.comment.update({ where: { id: args.id }, data: { content: input.content } });
    },

    /** Delete a comment; author or admin only. */
    deleteComment: async (_p: unknown, args: { id: string }, ctx: Context) => {
      const user = requireAuth(ctx);
      const comment = await ctx.prisma.comment.findUnique({ where: { id: args.id } });
      if (!comment) throw notFoundError('Comment not found');
      requireOwnerOrAdmin(user, comment.authorId);

      await ctx.prisma.comment.delete({ where: { id: args.id } });
      return true;
    },
  },

  // Field resolvers.
  Comment: {
    author: (parent: { authorId: string }, _a: unknown, ctx: Context) =>
      ctx.prisma.user.findUnique({ where: { id: parent.authorId } }),
    project: (parent: { projectId: string }, _a: unknown, ctx: Context) =>
      ctx.prisma.project.findUnique({ where: { id: parent.projectId } }),
  },
};
