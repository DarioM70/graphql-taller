import { Field, ID, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { TaskStatus } from '../enums/task-status.enum';

@InputType()
export class CreateTaskInput {
  @Field(() => ID)
  @IsUUID()
  projectId: string;

  @Field(() => String)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title: string;

  @Field(() => TaskStatus, { nullable: true })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
