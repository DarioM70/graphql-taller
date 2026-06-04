import { bootApp, stopApp, gql, register, errorCode } from './helpers';

beforeAll(async () => {
  await bootApp();
});
afterAll(async () => {
  await stopApp();
});

const CREATE = `mutation($input: CreateProjectInput!){ createProject(input:$input){ id name owner { email } } }`;

async function createProject(token: string, name = 'P1') {
  const res = await gql(CREATE, { input: { name, description: 'desc' } }, { token });
  return res.data!.createProject as { id: string; name: string };
}

describe('Project CRUD & ownership', () => {
  it('lets an authenticated user create a project they own', async () => {
    const user = await register('Admin', 'admin@test.com');
    const res = await gql(CREATE, { input: { name: 'My Project' } }, { token: user.token });
    expect(res.data!.createProject.owner.email).toBe('admin@test.com');
  });

  it('blocks project creation without auth', async () => {
    const res = await gql(CREATE, { input: { name: 'X' } });
    expect(errorCode(res)).toBe('UNAUTHENTICATED');
  });

  it('validates project input', async () => {
    const user = await register('Admin', 'admin@test.com');
    const res = await gql(CREATE, { input: { name: 'x' } }, { token: user.token });
    expect(errorCode(res)).toBe('BAD_USER_INPUT');
  });

  it('shows a regular user only their own projects', async () => {
    const admin = await register('Admin', 'admin@test.com');
    const bob = await register('Bob', 'bob@test.com');
    await createProject(admin.token, 'Admin P');
    await createProject(bob.token, 'Bob P');

    const res = await gql(`query { projects { name } }`, {}, { token: bob.token });
    expect(res.data!.projects).toHaveLength(1);
    expect(res.data!.projects[0].name).toBe('Bob P');
  });

  it('shows a superadmin every project', async () => {
    const admin = await register('Admin', 'admin@test.com');
    const bob = await register('Bob', 'bob@test.com');
    await createProject(admin.token, 'Admin P');
    await createProject(bob.token, 'Bob P');

    const res = await gql(`query { projects { name } }`, {}, { token: admin.token });
    expect(res.data!.projects).toHaveLength(2);
  });

  it('forbids a user from updating another user\'s project', async () => {
    const admin = await register('Admin', 'admin@test.com');
    const bob = await register('Bob', 'bob@test.com');
    const p = await createProject(admin.token, 'Admin P');

    const res = await gql(
      `mutation($id: ID!, $input: UpdateProjectInput!){ updateProject(id:$id, input:$input){ id } }`,
      { id: p.id, input: { name: 'Hacked' } },
      { token: bob.token },
    );
    expect(errorCode(res)).toBe('FORBIDDEN');
  });

  it('lets an admin manage any user\'s project', async () => {
    const admin = await register('Admin', 'admin@test.com');
    const bob = await register('Bob', 'bob@test.com');
    const p = await createProject(bob.token, 'Bob P');

    const res = await gql(
      `mutation($id: ID!, $input: UpdateProjectInput!){ updateProject(id:$id, input:$input){ name } }`,
      { id: p.id, input: { name: 'Admin edited' } },
      { token: admin.token },
    );
    expect(res.data!.updateProject.name).toBe('Admin edited');
  });

  it('lets the owner delete their project', async () => {
    const user = await register('Admin', 'admin@test.com');
    const p = await createProject(user.token);
    const res = await gql(`mutation($id: ID!){ deleteProject(id:$id) }`, { id: p.id }, { token: user.token });
    expect(res.data!.deleteProject).toBe(true);
  });

  it('returns NOT_FOUND deleting a missing project', async () => {
    const user = await register('Admin', 'admin@test.com');
    const res = await gql(`mutation($id: ID!){ deleteProject(id:$id) }`, { id: 'nope' }, { token: user.token });
    expect(errorCode(res)).toBe('NOT_FOUND');
  });
});
