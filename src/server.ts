import express, { Express } from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { GraphQLError } from 'graphql';

import { typeDefs } from './schema/typeDefs';
import { resolvers } from './resolvers';
import { buildContext, Context } from './context';

/**
 * Build the Apollo Server instance. `formatError` strips internal stack traces
 * and guarantees every error carries a stable `extensions.code`.
 */
export function buildApolloServer(): ApolloServer<Context> {
  return new ApolloServer<Context>({
    typeDefs,
    resolvers,
    formatError: (formatted, error) => {
      const original = error instanceof GraphQLError ? error : undefined;
      const code = (original?.extensions?.code as string) || formatted.extensions?.code || 'INTERNAL_SERVER_ERROR';
      return {
        message: formatted.message,
        path: formatted.path,
        extensions: {
          code,
          ...(original?.extensions?.details ? { details: original.extensions.details } : {}),
        },
      };
    },
  });
}

/**
 * Create the Express app with the Apollo GraphQL middleware mounted at
 * `/graphql`. Returns both so callers (server entry or tests) can manage the
 * Apollo lifecycle.
 */
export async function createApp(): Promise<{ app: Express; apollo: ApolloServer<Context> }> {
  const apollo = buildApolloServer();
  await apollo.start();

  const app = express();
  app.use(cors());
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(
    '/graphql',
    json(),
    expressMiddleware(apollo, {
      context: async ({ req }) => buildContext({ req }),
    }),
  );

  return { app, apollo };
}
