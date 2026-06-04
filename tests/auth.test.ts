import { bootApp, stopApp, gql, register, errorCode } from './helpers';

beforeAll(async () => {
  await bootApp();
});
afterAll(async () => {
  await stopApp();
});

describe('Authentication', () => {
  it('registers the first user as SUPERADMIN', async () => {
    const { user } = await register('Admin', 'admin@test.com');
    expect(user.role).toBe('SUPERADMIN');
  });

  it('registers subsequent users as USER', async () => {
    await register('Admin', 'admin@test.com');
    const { user } = await register('Regular', 'regular@test.com');
    expect(user.role).toBe('USER');
  });

  it('rejects duplicate emails with CONFLICT', async () => {
    await register('Admin', 'admin@test.com');
    const res = await gql(
      `mutation($input: RegisterInput!){ register(input:$input){ token } }`,
      { input: { name: 'Other', email: 'admin@test.com', password: 'Secret123*' } },
    );
    expect(errorCode(res)).toBe('CONFLICT');
  });

  it('rejects invalid input with BAD_USER_INPUT', async () => {
    const res = await gql(
      `mutation($input: RegisterInput!){ register(input:$input){ token } }`,
      { input: { name: 'x', email: 'not-an-email', password: '123' } },
    );
    expect(errorCode(res)).toBe('BAD_USER_INPUT');
  });

  it('logs in with valid credentials', async () => {
    await register('Admin', 'admin@test.com', 'Secret123*');
    const res = await gql(
      `mutation($input: LoginInput!){ login(input:$input){ token user { email } } }`,
      { input: { email: 'admin@test.com', password: 'Secret123*' } },
    );
    expect(res.data!.login.token).toBeTruthy();
    expect(res.data!.login.user.email).toBe('admin@test.com');
  });

  it('rejects login with wrong password (UNAUTHENTICATED)', async () => {
    await register('Admin', 'admin@test.com', 'Secret123*');
    const res = await gql(
      `mutation($input: LoginInput!){ login(input:$input){ token } }`,
      { input: { email: 'admin@test.com', password: 'WrongPass1' } },
    );
    expect(errorCode(res)).toBe('UNAUTHENTICATED');
  });

  it('blocks `me` without a token', async () => {
    const res = await gql(`query { me { id } }`);
    expect(errorCode(res)).toBe('UNAUTHENTICATED');
  });

  it('returns the current user from a valid token', async () => {
    const { token } = await register('Admin', 'admin@test.com');
    const res = await gql(`query { me { email role } }`, {}, { token });
    expect(res.data!.me.email).toBe('admin@test.com');
  });
});
