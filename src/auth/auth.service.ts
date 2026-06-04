import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { SignupInput } from './dto/signup.input';
import { LoginInput } from './dto/login.input';
import { AuthResponse } from './dto/auth-response';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { ValidRoles } from './enums/valid-roles.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private signToken(user: User): string {
    const payload: JwtPayload = { id: user.id };
    return this.jwtService.sign(payload);
  }

  /**
   * Public self-registration. The very first user becomes superadmin so the
   * system is usable out of the box; everyone else gets the `user` role.
   */
  async signup(input: SignupInput): Promise<AuthResponse> {
    const isFirstUser = (await this.usersService.count()) === 0;
    const roles = isFirstUser ? [ValidRoles.superadmin] : [ValidRoles.user];
    const user = await this.usersService.create({ ...input, roles });
    return { token: this.signToken(user), user };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(input.email);
    if (!user || !bcrypt.compareSync(input.password, user.password)) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) throw new UnauthorizedException('User is inactive');
    return { token: this.signToken(user), user };
  }
}
