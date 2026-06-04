import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { TaskStatus } from '../enums/task-status.enum';

@Entity({ name: 'tasks' })
@ObjectType()
export class Task {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column()
  @Field(() => String)
  title: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.TODO })
  @Field(() => TaskStatus)
  status: TaskStatus;

  @ManyToOne(() => Project, (project) => project.tasks, { onDelete: 'CASCADE', eager: true })
  @Field(() => Project)
  project: Project;

  // Optional assignee, loaded eagerly; null is set when the user is deleted.
  @ManyToOne(() => User, (user) => user.assignedTasks, { onDelete: 'SET NULL', nullable: true, eager: true })
  @Field(() => User, { nullable: true })
  assignee?: User;

  @CreateDateColumn()
  @Field(() => Date)
  createdAt: Date;

  @UpdateDateColumn()
  @Field(() => Date)
  updatedAt: Date;
}
