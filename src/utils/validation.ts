import { z } from 'zod';
import { badInputError } from './errors';

/**
 * Zod input schemas. `parseInput` runs a schema and converts Zod failures into
 * a GraphQL BAD_USER_INPUT error carrying field-level details.
 */

export function parseInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    throw badInputError('Validation failed', details);
  }
  return result.data;
}

const password = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(100, 'Password is too long');

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().email('A valid email is required'),
  password,
});

export const loginSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const createUserSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email('A valid email is required'),
  password,
  role: z.enum(['SUPERADMIN', 'USER']).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email('A valid email is required').optional(),
  password: password.optional(),
  role: z.enum(['SUPERADMIN', 'USER']).optional(),
});

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(120),
  description: z.string().max(2000).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
});

export const createTaskSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  title: z.string().min(2, 'Title must be at least 2 characters').max(160),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  assigneeId: z.string().min(1).nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(2).max(160).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  assigneeId: z.string().min(1).nullable().optional(),
});

export const createCommentSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
});
