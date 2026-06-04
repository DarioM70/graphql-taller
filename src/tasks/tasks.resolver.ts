import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { CreateTaskInput } from './dto/create-task.input';
import { UpdateTaskInput } from './dto/update-task.input';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Resolver(() => Task)
@UseGuards(GqlAuthGuard)
export class TasksResolver {
  constructor(private readonly tasksService: TasksService) {}

  @Mutation(() => Task, { name: 'createTask' })
  createTask(
    @Args('input') input: CreateTaskInput,
    @CurrentUser() user: User,
  ): Promise<Task> {
    return this.tasksService.create(input, user);
  }

  @Query(() => [Task], { name: 'tasks', description: 'Tasks of a project' })
  findByProject(
    @Args('projectId', { type: () => ID }) projectId: string,
  ): Promise<Task[]> {
    return this.tasksService.findByProject(projectId);
  }

  @Query(() => Task, { name: 'task' })
  findOne(@Args('id', { type: () => ID }) id: string): Promise<Task> {
    return this.tasksService.findOne(id);
  }

  @Mutation(() => Task, { name: 'updateTask' })
  updateTask(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateTaskInput,
    @CurrentUser() user: User,
  ): Promise<Task> {
    return this.tasksService.update(id, input, user);
  }

  @Mutation(() => Boolean, { name: 'deleteTask' })
  deleteTask(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    return this.tasksService.remove(id, user);
  }
}
