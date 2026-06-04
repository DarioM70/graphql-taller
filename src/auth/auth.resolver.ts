import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { AuthResponse } from './dto/auth-response';
import { SignupInput } from './dto/signup.input';
import { LoginInput } from './dto/login.input';

@Resolver(() => AuthResponse)
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthResponse, { name: 'signup', description: 'Register a new user' })
  signup(@Args('input') input: SignupInput): Promise<AuthResponse> {
    return this.authService.signup(input);
  }

  @Mutation(() => AuthResponse, { name: 'login', description: 'Authenticate and get a JWT' })
  login(@Args('input') input: LoginInput): Promise<AuthResponse> {
    return this.authService.login(input);
  }
}
