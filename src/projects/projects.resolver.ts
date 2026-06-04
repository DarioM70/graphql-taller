import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectsService } from './projects.service';
import { Project } from './entities/project.entity';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';
import { Task } from '../tasks/entities/task.entity';
import { Comment } from '../comments/entities/comment.entity';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Resolver(() => Project)
@UseGuards(GqlAuthGuard)
export class ProjectsResolver {
  constructor(
    private readonly projectsService: ProjectsService,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
  ) {}

  @Mutation(() => Project, { name: 'createProject' })
  createProject(
    @Args('input') input: CreateProjectInput,
    @CurrentUser() user: User,
  ): Promise<Project> {
    return this.projectsService.create(input, user);
  }

  @Query(() => [Project], { name: 'projects' })
  findAll(
    @CurrentUser() user: User,
    @Args('mine', { type: () => Boolean, nullable: true }) mine?: boolean,
  ): Promise<Project[]> {
    return this.projectsService.findAll(user, mine ?? false);
  }

  @Query(() => Project, { name: 'project' })
  findOne(@Args('id', { type: () => ID }) id: string): Promise<Project> {
    return this.projectsService.findOne(id);
  }

  @Mutation(() => Project, { name: 'updateProject' })
  updateProject(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateProjectInput,
    @CurrentUser() user: User,
  ): Promise<Project> {
    return this.projectsService.update(id, input, user);
  }

  @Mutation(() => Boolean, { name: 'deleteProject' })
  deleteProject(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    return this.projectsService.remove(id, user);
  }

  @ResolveField(() => [Task], { name: 'tasks' })
  tasks(@Parent() project: Project): Promise<Task[]> {
    return this.taskRepository.find({
      where: { project: { id: project.id } },
      order: { createdAt: 'ASC' },
    });
  }

  @ResolveField(() => [Comment], { name: 'comments' })
  comments(@Parent() project: Project): Promise<Comment[]> {
    return this.commentRepository.find({
      where: { project: { id: project.id } },
      order: { createdAt: 'ASC' },
    });
  }
}
