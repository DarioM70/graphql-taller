import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';

@Entity({ name: 'comments' })
@ObjectType()
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => ID)
  id: string;

  @Column({ type: 'text' })
  @Field(() => String)
  content: string;

  @ManyToOne(() => User, (user) => user.comments, { onDelete: 'CASCADE', eager: true })
  @Field(() => User)
  author: User;

  @ManyToOne(() => Project, (project) => project.comments, { onDelete: 'CASCADE', eager: true })
  @Field(() => Project)
  project: Project;

  @CreateDateColumn()
  @Field(() => Date)
  createdAt: Date;

  @UpdateDateColumn()
  @Field(() => Date)
  updatedAt: Date;
}
