import { Field, InputType } from '@nestjs/graphql';
import { IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class UpdateCommentInput {
  @Field(() => String)
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}
