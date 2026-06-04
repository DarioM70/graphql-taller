import { registerEnumType } from '@nestjs/graphql';

/** Lifecycle status of a Task (Module 2). */
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

// Expose the enum in the code-first GraphQL schema.
registerEnumType(TaskStatus, {
  name: 'TaskStatus',
  description: 'Lifecycle status of a task',
});
