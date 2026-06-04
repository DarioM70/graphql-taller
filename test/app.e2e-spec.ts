import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * End-to-end tests hitting the real GraphQL HTTP endpoint (Jest + Supertest)
 * against an isolated PostgreSQL test database. Requires DATABASE_URL to point
 * at a test DB (see docker-compose.yml / the CI Postgres service).
 */
describe('GraphQL API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const gql = (query: string, variables: Record<string, unknown> = {}, token?: string) => {
    const req = request(app.getHttpServer()).post('/graphql').send({ query, variables });
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  };

  const codeOf = (res: request.Response) => res.body.errors?.[0]?.extensions?.code;

  // The first signup becomes superadmin; subsequent ones are regular users.
  const signup = async (fullName: string, email: string, password = 'Secret123*') => {
    const res = await gql(
      `mutation($i: SignupInput!){ signup(input:$i){ token user { id email roles } } }`,
      { i: { fullName, email, password } },
    );
    return res.body.data.signup as { token: string; user: { id: string; roles: string[]; email: string } };
  };

  const createProject = async (token: string, name = 'Project') => {
    const res = await gql(
      `mutation($i: CreateProjectInput!){ createProject(input:$i){ id name } }`,
      { i: { name } },
      token,
    );
    return res.body.data.createProject as { id: string; name: string };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    dataSource = moduleRef.get(DataSource);
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE "comments","tasks","projects","users" RESTART IDENTITY CASCADE');
  });

  describe('Auth', () => {
    it('makes the first user a superadmin', async () => {
      const { user } = await signup('Admin', 'admin@test.com');
      expect(user.roles).toContain('superadmin');
    });

    it('makes subsequent users regular users', async () => {
      await signup('Admin', 'admin@test.com');
      const { user } = await signup('Bob', 'bob@test.com');
      expect(user.roles).toEqual(['user']);
    });

    it('rejects duplicate emails with CONFLICT', async () => {
      await signup('Admin', 'admin@test.com');
      const res = await gql(`mutation($i: SignupInput!){ signup(input:$i){ token } }`, {
        i: { fullName: 'Other', email: 'admin@test.com', password: 'Secret123*' },
      });
      expect(codeOf(res)).toBe('CONFLICT');
    });

    it('rejects invalid input with BAD_REQUEST', async () => {
      const res = await gql(`mutation($i: SignupInput!){ signup(input:$i){ token } }`, {
        i: { fullName: 'x', email: 'nope', password: '123' },
      });
      expect(codeOf(res)).toBe('BAD_REQUEST');
    });

    it('logs in with valid credentials', async () => {
      await signup('Admin', 'admin@test.com', 'Secret123*');
      const res = await gql(`mutation($i: LoginInput!){ login(input:$i){ token user { email } } }`, {
        i: { email: 'admin@test.com', password: 'Secret123*' },
      });
      expect(res.body.data.login.token).toBeTruthy();
    });

    it('rejects wrong password with UNAUTHENTICATED', async () => {
      await signup('Admin', 'admin@test.com', 'Secret123*');
      const res = await gql(`mutation($i: LoginInput!){ login(input:$i){ token } }`, {
        i: { email: 'admin@test.com', password: 'WrongPass1' },
      });
      expect(codeOf(res)).toBe('UNAUTHENTICATED');
    });

    it('blocks `me` without a token', async () => {
      const res = await gql(`query { me { id } }`);
      expect(codeOf(res)).toBe('UNAUTHENTICATED');
    });
  });

  describe('Users & roles', () => {
    it('lets any authenticated user list users', async () => {
      const admin = await signup('Admin', 'admin@test.com');
      await signup('Bob', 'bob@test.com');
      const res = await gql(`query { users { id email } }`, {}, admin.token);
      expect(res.body.data.users).toHaveLength(2);
    });

    it('lets a superadmin create a user', async () => {
      const admin = await signup('Admin', 'admin@test.com');
      const res = await gql(
        `mutation($i: CreateUserInput!){ createUser(input:$i){ id email roles } }`,
        { i: { fullName: 'New', email: 'new@test.com', password: 'Secret123*', roles: ['user'] } },
        admin.token,
      );
      expect(res.body.data.createUser.email).toBe('new@test.com');
    });

    it('forbids a regular user from creating users', async () => {
      await signup('Admin', 'admin@test.com');
      const reg = await signup('Reg', 'reg@test.com');
      const res = await gql(
        `mutation($i: CreateUserInput!){ createUser(input:$i){ id } }`,
        { i: { fullName: 'New', email: 'new@test.com', password: 'Secret123*' } },
        reg.token,
      );
      expect(codeOf(res)).toBe('FORBIDDEN');
    });

    it('prevents a superadmin from deleting themselves', async () => {
      const admin = await signup('Admin', 'admin@test.com');
      const res = await gql(`mutation($id: ID!){ deleteUser(id:$id) }`, { id: admin.user.id }, admin.token);
      expect(codeOf(res)).toBe('CONFLICT');
    });
  });

  describe('Projects (Module 1)', () => {
    it('creates a project owned by the current user', async () => {
      const admin = await signup('Admin', 'admin@test.com');
      const res = await gql(
        `mutation($i: CreateProjectInput!){ createProject(input:$i){ name owner { email } } }`,
        { i: { name: 'My Project' } },
        admin.token,
      );
      expect(res.body.data.createProject.owner.email).toBe('admin@test.com');
    });

    it('shows a regular user only their own projects', async () => {
      const admin = await signup('Admin', 'admin@test.com');
      const bob = await signup('Bob', 'bob@test.com');
      await createProject(admin.token, 'Admin P');
      await createProject(bob.token, 'Bob P');
      const res = await gql(`query { projects { name } }`, {}, bob.token);
      expect(res.body.data.projects).toHaveLength(1);
      expect(res.body.data.projects[0].name).toBe('Bob P');
    });

    it('shows a superadmin every project', async () => {
      const admin = await signup('Admin', 'admin@test.com');
      const bob = await signup('Bob', 'bob@test.com');
      await createProject(admin.token, 'Admin P');
      await createProject(bob.token, 'Bob P');
      const res = await gql(`query { projects { name } }`, {}, admin.token);
      expect(res.body.data.projects).toHaveLength(2);
    });

    it("forbids editing another user's project", async () => {
      const admin = await signup('Admin', 'admin@test.com');
      const bob = await signup('Bob', 'bob@test.com');
      const p = await createProject(admin.token, 'Admin P');
      const res = await gql(
        `mutation($id: ID!, $i: UpdateProjectInput!){ updateProject(id:$id, input:$i){ id } }`,
        { id: p.id, i: { name: 'Hacked' } },
        bob.token,
      );
      expect(codeOf(res)).toBe('FORBIDDEN');
    });

    it("lets an admin manage another user's project", async () => {
      const admin = await signup('Admin', 'admin@test.com');
      const bob = await signup('Bob', 'bob@test.com');
      const p = await createProject(bob.token, 'Bob P');
      const res = await gql(
        `mutation($id: ID!, $i: UpdateProjectInput!){ updateProject(id:$id, input:$i){ name } }`,
        { id: p.id, i: { name: 'Admin edited' } },
        admin.token,
      );
      expect(res.body.data.updateProject.name).toBe('Admin edited');
    });
  });

  describe('Tasks (Module 2) & Comments', () => {
    it('creates and lists a task under an owned project', async () => {
      const admin = await signup('Admin', 'admin@test.com');
      const p = await createProject(admin.token);
      const created = await gql(
        `mutation($i: CreateTaskInput!){ createTask(input:$i){ id title status project { id } } }`,
        { i: { projectId: p.id, title: 'Write tests' } },
        admin.token,
      );
      expect(created.body.data.createTask.status).toBe('TODO');
      const list = await gql(`query($pid: ID!){ tasks(projectId:$pid){ title } }`, { pid: p.id }, admin.token);
      expect(list.body.data.tasks).toHaveLength(1);
    });

    it("forbids creating a task on another user's project", async () => {
      const admin = await signup('Admin', 'admin@test.com');
      const bob = await signup('Bob', 'bob@test.com');
      const p = await createProject(admin.token);
      const res = await gql(
        `mutation($i: CreateTaskInput!){ createTask(input:$i){ id } }`,
        { i: { projectId: p.id, title: 'Sneaky' } },
        bob.token,
      );
      expect(codeOf(res)).toBe('FORBIDDEN');
    });

    it('lets any authenticated user comment, but only the author edits', async () => {
      const admin = await signup('Admin', 'admin@test.com');
      const bob = await signup('Bob', 'bob@test.com');
      const p = await createProject(admin.token);
      const c = await gql(
        `mutation($i: CreateCommentInput!){ createComment(input:$i){ id author { email } } }`,
        { i: { projectId: p.id, content: 'Nice!' } },
        bob.token,
      );
      expect(c.body.data.createComment.author.email).toBe('bob@test.com');

      const carl = await signup('Carl', 'carl@test.com');
      const res = await gql(
        `mutation($id: ID!, $i: UpdateCommentInput!){ updateComment(id:$id, input:$i){ content } }`,
        { id: c.body.data.createComment.id, i: { content: 'edited' } },
        carl.token,
      );
      expect(codeOf(res)).toBe('FORBIDDEN');
    });

    it('lets an admin delete any comment', async () => {
      const admin = await signup('Admin', 'admin@test.com');
      const bob = await signup('Bob', 'bob@test.com');
      const p = await createProject(admin.token);
      const c = await gql(
        `mutation($i: CreateCommentInput!){ createComment(input:$i){ id } }`,
        { i: { projectId: p.id, content: 'hi' } },
        bob.token,
      );
      const res = await gql(
        `mutation($id: ID!){ deleteComment(id:$id) }`,
        { id: c.body.data.createComment.id },
        admin.token,
      );
      expect(res.body.data.deleteComment).toBe(true);
    });
  });
});
