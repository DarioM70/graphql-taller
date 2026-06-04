import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskInput } from './dto/create-task.input';
import { UpdateTaskInput } from './dto/update-task.input';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly projectsService: ProjectsService,
    private readonly usersService: UsersService,
  ) {}

  async create(input: CreateTaskInput, user: User): Promise<Task> {
    const project = await this.projectsService.findOne(input.projectId);
    this.projectsService.ensureCanManage(project, user);
    const assignee = await this.resolveAssignee(input.assigneeId);

    const task = this.taskRepository.create({
      title: input.title,
      status: input.status,
      project,
      assignee,
    });
    return this.taskRepository.save(task);
  }

  async findByProject(projectId: string): Promise<Task[]> {
    await this.projectsService.findOne(projectId); // 404 if the project is missing
    return this.taskRepository.find({
      where: { project: { id: projectId } },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOneBy({ id });
    if (!task) throw new NotFoundException(`Task with id ${id} not found`);
    return task;
  }

  async update(id: string, input: UpdateTaskInput, user: User): Promise<Task> {
    const task = await this.findOne(id);
    this.projectsService.ensureCanManage(task.project, user);

    if (input.title !== undefined) task.title = input.title;
    if (input.status !== undefined) task.status = input.status;
    if (input.assigneeId !== undefined) {
      task.assignee = (await this.resolveAssignee(input.assigneeId)) ?? undefined;
    }
    return this.taskRepository.save(task);
  }

  async remove(id: string, user: User): Promise<boolean> {
    const task = await this.findOne(id);
    this.projectsService.ensureCanManage(task.project, user);
    await this.taskRepository.remove(task);
    return true;
  }

  private async resolveAssignee(assigneeId?: string): Promise<User | undefined> {
    if (!assigneeId) return undefined;
    const assignee = await this.usersService.findByIdForAuth(assigneeId);
    if (!assignee) throw new BadRequestException(`Assignee with id ${assigneeId} not found`);
    return assignee;
  }
}
