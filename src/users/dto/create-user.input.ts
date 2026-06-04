import { Field, InputType } from '@nestjs/graphql';
import { IsArray, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ValidRoles } from '../../auth/enums/valid-roles.enum';

@InputType()
export class CreateUserInput {
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

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsIn(Object.values(ValidRoles), { each: true })
  roles?: string[];
}
