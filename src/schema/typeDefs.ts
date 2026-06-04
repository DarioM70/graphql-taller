import gql from 'graphql-tag';

/**
 * GraphQL schema. Mirrors the data model: User, Project (Module 1),
 * Task (Module 2, linked to a Project) and Comment.
 */
export const typeDefs = gql`
  enum Role {
    SUPERADMIN
    USER
  }

  enum TaskStatus {
    TODO
    IN_PROGRESS
    DONE
  }

  type User {
    id: ID!
    name: String!
    email: String!
    role: Role!
    createdAt: String!
    updatedAt: String!
    projects: [Project!]!
  }

  type Project {
    id: ID!
    name: String!
    description: String
    owner: User!
    tasks: [Task!]!
    comments: [Comment!]!
    createdAt: String!
    updatedAt: String!
  }

  type Task {
    id: ID!
    title: String!
    status: TaskStatus!
    project: Project!
    assignee: User
    createdAt: String!
    updatedAt: String!
  }

  type Comment {
    id: ID!
    content: String!
    author: User!
    project: Project!
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  # ---------- Inputs ----------
  input RegisterInput {
    name: String!
    email: String!
    password: String!
  }

  input LoginInput {
    email: String!
    password: String!
  }

  input CreateUserInput {
    name: String!
    email: String!
    password: String!
    role: Role
  }

  input UpdateUserInput {
    name: String
    email: String
    password: String
    role: Role
  }

  input CreateProjectInput {
    name: String!
    description: String
  }

  input UpdateProjectInput {
    name: String
    description: String
  }

  input CreateTaskInput {
    projectId: ID!
    title: String!
    status: TaskStatus
    assigneeId: ID
  }

  input UpdateTaskInput {
    title: String
    status: TaskStatus
    assigneeId: ID
  }

  input CreateCommentInput {
    projectId: ID!
    content: String!
  }

  input UpdateCommentInput {
    content: String!
  }

  # ---------- Queries ----------
  type Query {
    "Current authenticated user"
    me: User!

    "List all users (any authenticated user)"
    users: [User!]!
    "Get a single user by id"
    user(id: ID!): User!

    "List projects. Superadmin sees all; a regular user sees only their own. Pass mine:true to force own projects."
    projects(mine: Boolean): [Project!]!
    "Get a single project by id"
    project(id: ID!): Project!

    "List tasks of a project"
    tasks(projectId: ID!): [Task!]!
    "Get a single task by id"
    task(id: ID!): Task!

    "List comments of a project"
    comments(projectId: ID!): [Comment!]!
  }

  # ---------- Mutations ----------
  type Mutation {
    # Auth
    register(input: RegisterInput!): AuthPayload!
    login(input: LoginInput!): AuthPayload!

    # Users (superadmin only for write ops)
    createUser(input: CreateUserInput!): User!
    updateUser(id: ID!, input: UpdateUserInput!): User!
    deleteUser(id: ID!): Boolean!

    # Projects (owner or admin)
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    deleteProject(id: ID!): Boolean!

    # Tasks (project owner or admin)
    createTask(input: CreateTaskInput!): Task!
    updateTask(id: ID!, input: UpdateTaskInput!): Task!
    deleteTask(id: ID!): Boolean!

    # Comments (author or admin for write/delete)
    createComment(input: CreateCommentInput!): Comment!
    updateComment(id: ID!, input: UpdateCommentInput!): Comment!
    deleteComment(id: ID!): Boolean!
  }
`;
