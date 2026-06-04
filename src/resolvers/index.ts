import { authResolvers } from './auth.resolvers';
import { userResolvers } from './user.resolvers';
import { projectResolvers } from './project.resolvers';
import { taskResolvers } from './task.resolvers';
import { commentResolvers } from './comment.resolvers';

// Serialize a Date (or ISO string) to ISO-8601 for the String date fields.
const iso = (v: Date | string | null) => (v instanceof Date ? v.toISOString() : v);
const dateFields = {
  createdAt: (p: { createdAt: Date | string }) => iso(p.createdAt),
  updatedAt: (p: { updatedAt: Date | string }) => iso(p.updatedAt),
};

/**
 * Merge all resolver modules into a single map. Query/Mutation objects are
 * spread together; type-level field resolvers are combined per type and
 * augmented with the shared createdAt/updatedAt serializers.
 */
export const resolvers = {
  Query: {
    ...userResolvers.Query,
    ...projectResolvers.Query,
    ...taskResolvers.Query,
    ...commentResolvers.Query,
  },
  Mutation: {
    ...authResolvers.Mutation,
    ...userResolvers.Mutation,
    ...projectResolvers.Mutation,
    ...taskResolvers.Mutation,
    ...commentResolvers.Mutation,
  },
  User: { ...userResolvers.User, ...dateFields },
  Project: { ...projectResolvers.Project, ...dateFields },
  Task: { ...taskResolvers.Task, ...dateFields },
  Comment: { ...commentResolvers.Comment, ...dateFields },
};
