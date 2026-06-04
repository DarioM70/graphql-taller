import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class SignupInput {
  @Field(() => String)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName: string;

  @Field(() => String)
  @IsEmail()
  email: string;

  @Field(() => String)
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;
}
