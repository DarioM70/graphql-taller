import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { User } from '../../users/entities/user.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly usersService: UsersService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'dev_secret_change_me',
      ignoreExpiration: false,
    });
  }

  /** Runs on every authenticated request; resolves the JWT into the User entity. */
  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findByIdForAuth(payload.id);
    if (!user) throw new UnauthorizedException('Token is not valid');
    if (!user.isActive) throw new UnauthorizedException('User is inactive, contact a superadmin');
    return user;
  }
}
