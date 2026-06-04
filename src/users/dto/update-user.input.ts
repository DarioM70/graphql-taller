import { InputType, PartialType } from '@nestjs/graphql';
import { CreateUserInput } from './create-user.input';

/** All fields optional; the user id is passed as a separate mutation argument. */
@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {}
