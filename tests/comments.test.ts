import { bootApp, stopApp, gql, register, errorCode } from './helpers';

beforeAll(async () => {
  await bootApp();
});
afterAll(async () => {
  await stopApp();
});

async function createProject(token: string) {
  const res = await gql(
    `mutation($input: CreateProjectInput!){ createProject(input:$input){ id } }`,
    { input: { name: 'Project' } },
    { token },
  );
  return res.data!.createProject.id as string;
}

async function createComment(token: string, projectId: string, content = 'Nice!') {
  const res = await gql(
    `mutation($input: CreateCommentInput!){ createComment(input:$input){ id content author { email } } }`,
    { input: { projectId, content } },
    { token },
  );
  return res.data!.createComment;
}

describe('Comment CRUD & authorization', () => {
  it('lets any authenticated user comment on a project', async () => {
    const admin = await register('Admin', 'admin@test.com');
    const bob = await register('Bob', 'bob@test.com');
    const projectId = await createProject(admin.token);
    const comment = await createComment(bob.token, projectId);
    expect(comment.author.email).toBe('bob@test.com');
  });

  it('blocks commenting without auth', async () => {
    const admin = await register('Admin', 'admin@test.com');
    const projectId = await createProject(admin.token);
    const res = await gql(
      `mutation($input: CreateCommentInput!){ createComment(input:$input){ id } }`,
      { input: { projectId, content: 'hi' } },
    );
    expect(errorCode(res)).toBe('UNAUTHENTICATED');
  });

  it('rejects an empty comment', async () => {
    const admin = await register('Admin', 'admin@test.com');
    const projectId = await createProject(admin.token);
    const res = await gql(
      `mutation($input: CreateCommentInput!){ createComment(input:$input){ id } }`,
      { input: { projectId, content: '' } },
      { token: admin.token },
    );
    expect(errorCode(res)).toBe('BAD_USER_INPUT');
  });

  it('forbids a non-author regular user from editing a comment', async () => {
    await register('Admin', 'admin@test.com');
    const bob = await register('Bob', 'bob@test.com');
    const carl = await register('Carl', 'carl@test.com');
    const projectId = await createProject(bob.token);
    const comment = await createComment(bob.token, projectId);

    const res = await gql(
      `mutation($id: ID!, $input: UpdateCommentInput!){ updateComment(id:$id, input:$input){ content } }`,
      { id: comment.id, input: { content: 'edited' } },
      { token: carl.token },
    );
    expect(errorCode(res)).toBe('FORBIDDEN');
  });

  it('lets the author edit their comment', async () => {
    const admin = await register('Admin', 'admin@test.com');
    const projectId = await createProject(admin.token);
    const comment = await createComment(admin.token, projectId);
    const res = await gql(
      `mutation($id: ID!, $input: UpdateCommentInput!){ updateComment(id:$id, input:$input){ content } }`,
      { id: comment.id, input: { content: 'edited' } },
      { token: admin.token },
    );
    expect(res.data!.updateComment.content).toBe('edited');
  });

  it('lets an admin delete any comment', async () => {
    const admin = await register('Admin', 'admin@test.com');
    const bob = await register('Bob', 'bob@test.com');
    const projectId = await createProject(admin.token);
    const comment = await createComment(bob.token, projectId);
    const res = await gql(`mutation($id: ID!){ deleteComment(id:$id) }`, { id: comment.id }, { token: admin.token });
    expect(res.data!.deleteComment).toBe(true);
  });

  it('lists comments of a project', async () => {
    const admin = await register('Admin', 'admin@test.com');
    const projectId = await createProject(admin.token);
    await createComment(admin.token, projectId, 'one');
    await createComment(admin.token, projectId, 'two');
    const res = await gql(`query($pid: ID!){ comments(projectId:$pid){ content } }`, { pid: projectId }, { token: admin.token });
    expect(res.data!.comments).toHaveLength(2);
  });
});
