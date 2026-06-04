import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectInput } from './dto/create-project.input';
import { UpdateProjectInput } from './dto/update-project.input';
import { User } from '../users/entities/user.entity';
import { ValidRoles } from '../auth/enums/valid-roles.enum';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  create(input: CreateProjectInput, owner: User): Promise<Project> {
    const project = this.projectRepository.create({ ...input, owner });
    return this.projectRepository.save(project);
  }

  /** Superadmin sees every project; a regular user only their own. */
  findAll(user: User, onlyMine = false): Promise<Project[]> {
    const isAdmin = user.roles.includes(ValidRoles.superadmin);
    const scopeToOwner = onlyMine || !isAdmin;
    return this.projectRepository.find({
      where: scopeToOwner ? { owner: { id: user.id } } : {},
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projectRepository.findOneBy({ id });
    if (!project) throw new NotFoundException(`Project with id ${id} not found`);
    return project;
  }

  async update(id: string, input: UpdateProjectInput, user: User): Promise<Project> {
    const project = await this.findOne(id);
    this.ensureCanManage(project, user);
    Object.assign(project, input);
    return this.projectRepository.save(project);
  }

  async remove(id: string, user: User): Promise<boolean> {
    const project = await this.findOne(id);
    this.ensureCanManage(project, user);
    await this.projectRepository.remove(project);
    return true;
  }

  /** Throws FORBIDDEN unless the user owns the project or is a superadmin. */
  ensureCanManage(project: Project, user: User): void {
    const isAdmin = user.roles.includes(ValidRoles.superadmin);
    if (!isAdmin && project.owner.id !== user.id) {
      throw new ForbiddenException('You can only manage your own projects');
    }
  }
}
