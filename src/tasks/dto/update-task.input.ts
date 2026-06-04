import { InputType, OmitType, PartialType } from '@nestjs/graphql';
import { CreateTaskInput } from './create-task.input';

// All fields optional except the project, which cannot be changed after creation.
@InputType()
export class UpdateTaskInput extends PartialType(
  OmitType(CreateTaskInput, ['projectId'] as const),
) {}
