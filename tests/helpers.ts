import supertest from 'supertest';
import type { Express } from 'express';
import type { ApolloServer } from '@apollo/server';
import { createApp } from '../src/server';
import type { Context } from '../src/context';

let app: Express;
let apollo: ApolloServer<Context>;

/** Boot the Apollo + Express app once and reuse it across a test file. */
export async function bootApp(): Promise<Express> {
  if (!app) {
    const created = await createApp();
    app = created.app;
    apollo = created.apollo;
  }
  return app;
}

/** Stop Apollo after a test file finishes. */
export async function stopApp(): Promise<void> {
  if (apollo) await apollo.stop();
}

interface GqlOptions {
  token?: string;
}

/** Execute a GraphQL operation through the HTTP layer (like a real client). */
export async function gql(
  query: string,
  variables: Record<string, unknown> = {},
  opts: GqlOptions = {},
) {
  const req = supertest(app).post('/graphql').send({ query, variables });
  if (opts.token) req.set('Authorization', `Bearer ${opts.token}`);
  const res = await req;
  return res.body as { data?: any; errors?: Array<{ message: string; extensions?: { code?: string } }> };
}

/** Register a user and return { token, user }. The very first one is SUPERADMIN. */
export async function register(name: string, email: string, password = 'Secret123*') {
  const res = await gql(
    `mutation($input: RegisterInput!) {
       register(input: $input) { token user { id name email role } }
     }`,
    { input: { name, email, password } },
  );
  return res.data!.register as { token: string; user: { id: string; role: string; email: string } };
}

/** Convenience: the error code of the first GraphQL error (or undefined). */
export function errorCode(res: { errors?: Array<{ extensions?: { code?: string } }> }) {
  return res.errors?.[0]?.extensions?.code;
}
