import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectsService } from './projects.service';
import { ProjectsResolver } from './projects.resolver';
import { Project } from './entities/project.entity';
import { Task } from '../tasks/entities/task.entity';
import { Comment } from '../comments/entities/comment.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Project, Task, Comment]), AuthModule],
  providers: [ProjectsResolver, ProjectsService],
  exports: [ProjectsService, TypeOrmModule],
})
export class ProjectsModule {}
