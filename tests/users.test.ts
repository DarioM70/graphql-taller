import { bootApp, stopApp, gql, register, errorCode } from './helpers';

beforeAll(async () => {
  await bootApp();
});
afterAll(async () => {
  await stopApp();
});

describe('User management & authorization', () => {
  it('lets any authenticated user list users', async () => {
    const admin = await register('Admin', 'admin@test.com');
    await register('Bob', 'bob@test.com');
    const res = await gql(`query { users { id email } }`, {}, { token: admin.token });
    expect(res.data!.users.length).toBe(2);
  });

  it('blocks listing users when unauthenticated', async () => {
    const res = await gql(`query { users { id } }`);
    expect(errorCode(res)).toBe('UNAUTHENTICATED');
  });

  it('lets a superadmin create a user', async () => {
    const admin = await register('Admin', 'admin@test.com');
    const res = await gql(
      `mutation($input: CreateUserInput!){ createUser(input:$input){ id email role } }`,
      { input: { name: 'New', email: 'new@test.com', password: 'Secret123*', role: 'USER' } },
      { token: admin.token },
    );
    expect(res.data!.createUser.email).toBe('new@test.com');
  });

  it('forbids a regular user from creating users', async () => {
    await register('Admin', 'admin@test.com');
    const regular = await register('Reg', 'reg@test.com');
    const res = await gql(
      `mutation($input: CreateUserInput!){ createUser(input:$input){ id } }`,
      { input: { name: 'New', email: 'new@test.com', password: 'Secret123*' } },
      { token: regular.token },
    );
    expect(errorCode(res)).toBe('FORBIDDEN');
  });

  it('lets a superadmin update a user', async () => {
    const admin = await register('Admin', 'admin@test.com');
    const bob = await register('Bob', 'bob@test.com');
    const res = await gql(
      `mutation($id: ID!, $input: UpdateUserInput!){ updateUser(id:$id, input:$input){ name role } }`,
      { id: bob.user.id, input: { name: 'Bob Updated', role: 'SUPERADMIN' } },
      { token: admin.token },
    );
    expect(res.data!.updateUser.name).toBe('Bob Updated');
    expect(res.data!.updateUser.role).toBe('SUPERADMIN');
  });

  it('forbids a regular user from deleting users', async () => {
    const admin = await register('Admin', 'admin@test.com');
    const regular = await register('Reg', 'reg@test.com');
    const res = await gql(
      `mutation($id: ID!){ deleteUser(id:$id) }`,
      { id: admin.user.id },
      { token: regular.token },
    );
    expect(errorCode(res)).toBe('FORBIDDEN');
  });

  it('lets a superadmin delete another user', async () => {
    const admin = await register('Admin', 'admin@test.com');
    const bob = await register('Bob', 'bob@test.com');
    const res = await gql(`mutation($id: ID!){ deleteUser(id:$id) }`, { id: bob.user.id }, { token: admin.token });
    expect(res.data!.deleteUser).toBe(true);
  });

  it('prevents a superadmin from deleting themselves', async () => {
    const admin = await register('Admin', 'admin@test.com');
    const res = await gql(`mutation($id: ID!){ deleteUser(id:$id) }`, { id: admin.user.id }, { token: admin.token });
    expect(errorCode(res)).toBe('CONFLICT');
  });

  it('returns NOT_FOUND for a missing user', async () => {
    const admin = await register('Admin', 'admin@test.com');
    const res = await gql(`query($id: ID!){ user(id:$id){ id } }`, { id: 'does-not-exist' }, { token: admin.token });
    expect(errorCode(res)).toBe('NOT_FOUND');
  });
});
