import { Field, ID, InputType } from '@nestjs/graphql';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

@InputType()
export class CreateCommentInput {
  @Field(() => ID)
  @IsUUID()
  projectId: string;

  @Field(() => String)
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}
