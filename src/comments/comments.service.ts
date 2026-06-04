import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { CreateCommentInput } from './dto/create-comment.input';
import { UpdateCommentInput } from './dto/update-comment.input';
import { ProjectsService } from '../projects/projects.service';
import { User } from '../users/entities/user.entity';
import { ValidRoles } from '../auth/enums/valid-roles.enum';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    private readonly projectsService: ProjectsService,
  ) {}

  /** Any authenticated user can comment on an existing project. */
  async create(input: CreateCommentInput, author: User): Promise<Comment> {
    const project = await this.projectsService.findOne(input.projectId);
    const comment = this.commentRepository.create({ content: input.content, project, author });
    return this.commentRepository.save(comment);
  }

  async findByProject(projectId: string): Promise<Comment[]> {
    await this.projectsService.findOne(projectId); // 404 if the project is missing
    return this.commentRepository.find({
      where: { project: { id: projectId } },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Comment> {
    const comment = await this.commentRepository.findOneBy({ id });
    if (!comment) throw new NotFoundException(`Comment with id ${id} not found`);
    return comment;
  }

  async update(id: string, input: UpdateCommentInput, user: User): Promise<Comment> {
    const comment = await this.findOne(id);
    this.ensureCanManage(comment, user);
    comment.content = input.content;
    return this.commentRepository.save(comment);
  }

  async remove(id: string, user: User): Promise<boolean> {
    const comment = await this.findOne(id);
    this.ensureCanManage(comment, user);
    await this.commentRepository.remove(comment);
    return true;
  }

  /** Throws FORBIDDEN unless the user is the comment's author or a superadmin. */
  private ensureCanManage(comment: Comment, user: User): void {
    const isAdmin = user.roles.includes(ValidRoles.superadmin);
    if (!isAdmin && comment.author.id !== user.id) {
      throw new ForbiddenException('You can only manage your own comments');
    }
  }
}
