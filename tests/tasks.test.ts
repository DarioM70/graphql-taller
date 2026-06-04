import { bootApp, stopApp, gql, register, errorCode } from './helpers';

beforeAll(async () => {
  await bootApp();
});
afterAll(async () => {
  await stopApp();
});

async function createProject(token: string, name = 'P1') {
  const res = await gql(
    `mutation($input: CreateProjectInput!){ createProject(input:$input){ id } }`,
    { input: { name } },
    { token },
  );
  return res.data!.createProject.id as string;
}

describe('Task CRUD (Module 2, linked to a Project)', () => {
  it('creates a task under an owned project', async () => {
    const user = await register('Admin', 'admin@test.com');
    const projectId = await createProject(user.token);
    const res = await gql(
      `mutation($input: CreateTaskInput!){ createTask(input:$input){ id title status project { id } } }`,
      { input: { projectId, title: 'Write tests' } },
      { token: user.token },
    );
    expect(res.data!.createTask.title).toBe('Write tests');
    expect(res.data!.createTask.status).toBe('TODO');
    expect(res.data!.createTask.project.id).toBe(projectId);
  });

  it('forbids creating a task on another user\'s project', async () => {
    const admin = await register('Admin', 'admin@test.com');
    const bob = await register('Bob', 'bob@test.com');
    const projectId = await createProject(admin.token);
    const res = await gql(
      `mutation($input: CreateTaskInput!){ createTask(input:$input){ id } }`,
      { input: { projectId, title: 'Sneaky task' } },
      { token: bob.token },
    );
    expect(errorCode(res)).toBe('FORBIDDEN');
  });

  it('updates a task status', async () => {
    const user = await register('Admin', 'admin@test.com');
    const projectId = await createProject(user.token);
    const created = await gql(
      `mutation($input: CreateTaskInput!){ createTask(input:$input){ id } }`,
      { input: { projectId, title: 'Task' } },
      { token: user.token },
    );
    const id = created.data!.createTask.id;
    const res = await gql(
      `mutation($id: ID!, $input: UpdateTaskInput!){ updateTask(id:$id, input:$input){ status } }`,
      { id, input: { status: 'DONE' } },
      { token: user.token },
    );
    expect(res.data!.updateTask.status).toBe('DONE');
  });

  it('rejects an invalid status enum value', async () => {
    const user = await register('Admin', 'admin@test.com');
    const projectId = await createProject(user.token);
    const res = await gql(
      `mutation($input: CreateTaskInput!){ createTask(input:$input){ id } }`,
      { input: { projectId, title: 'Valid title', status: 'NOPE' } },
      { token: user.token },
    );
    // Invalid enum is caught by GraphQL validation before resolvers run.
    expect(res.errors?.length).toBeGreaterThan(0);
  });

  it('lists tasks of a project', async () => {
    const user = await register('Admin', 'admin@test.com');
    const projectId = await createProject(user.token);
    await gql(
      `mutation($input: CreateTaskInput!){ createTask(input:$input){ id } }`,
      { input: { projectId, title: 'Task A' } },
      { token: user.token },
    );
    const res = await gql(`query($pid: ID!){ tasks(projectId:$pid){ title } }`, { pid: projectId }, { token: user.token });
    expect(res.data!.tasks).toHaveLength(1);
  });

  it('deletes a task', async () => {
    const user = await register('Admin', 'admin@test.com');
    const projectId = await createProject(user.token);
    const created = await gql(
      `mutation($input: CreateTaskInput!){ createTask(input:$input){ id } }`,
      { input: { projectId, title: 'Task' } },
      { token: user.token },
    );
    const res = await gql(
      `mutation($id: ID!){ deleteTask(id:$id) }`,
      { id: created.data!.createTask.id },
      { token: user.token },
    );
    expect(res.data!.deleteTask).toBe(true);
  });
});
