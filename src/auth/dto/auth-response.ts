import { Field, ObjectType } from '@nestjs/graphql';
import { User } from '../../users/entities/user.entity';

/** Returned by `signup` and `login`: a signed JWT plus the authenticated user. */
@ObjectType()
export class AuthResponse {
  @Field(() => String)
  token: string;

  @Field(() => User)
  user: User;
}
