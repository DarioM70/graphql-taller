import { GraphQLError } from 'graphql';

/**
 * Typed helpers that build GraphQLError instances with a stable
 * `extensions.code`. Apollo Server surfaces these codes to clients so the
 * frontend can branch on them instead of parsing error messages.
 */

export function unauthenticatedError(message = 'You must be authenticated to perform this action'): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
  });
}

export function forbiddenError(message = 'You do not have permission to perform this action'): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'FORBIDDEN', http: { status: 403 } },
  });
}

export function notFoundError(message = 'Resource not found'): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'NOT_FOUND', http: { status: 404 } },
  });
}

export function badInputError(message = 'Invalid input', details?: unknown): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'BAD_USER_INPUT', http: { status: 400 }, details },
  });
}

export function conflictError(message = 'Resource already exists'): GraphQLError {
  return new GraphQLError(message, {
    extensions: { code: 'CONFLICT', http: { status: 409 } },
  });
}
