import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { ValidRoles } from '../auth/enums/valid-roles.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /** Create a user with a hashed password. Defaults to the `user` role. */
  async create(input: CreateUserInput): Promise<User> {
    await this.assertEmailIsFree(input.email);
    try {
      const user = this.userRepository.create({
        ...input,
        password: bcrypt.hashSync(input.password, 10),
        roles: input.roles?.length ? input.roles : [ValidRoles.user],
      });
      return await this.userRepository.save(user);
    } catch (error) {
      this.handleDbError(error);
    }
  }

  findAll(): Promise<User[]> {
    return this.userRepository.find({ order: { createdAt: 'ASC' } });
  }

  /** Lookup by id, throwing NOT_FOUND when missing (used by resolvers). */
  async findOneById(id: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    return user;
  }

  /** Nullable lookup (used by the JWT strategy to validate tokens). */
  findByIdForAuth(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  count(): Promise<number> {
    return this.userRepository.count();
  }

  /** Update any user (superadmin only). Re-hashes the password if provided. */
  async update(id: string, input: UpdateUserInput): Promise<User> {
    const user = await this.findOneById(id);
    if (input.email && input.email !== user.email) {
      await this.assertEmailIsFree(input.email);
    }
    const { password, ...rest } = input;
    Object.assign(user, rest);
    if (password) user.password = bcrypt.hashSync(password, 10);
    try {
      return await this.userRepository.save(user);
    } catch (error) {
      this.handleDbError(error);
    }
  }

  async remove(id: string): Promise<User> {
    const user = await this.findOneById(id);
    const removed = await this.userRepository.remove(user);
    return { ...removed, id } as User;
  }

  private async assertEmailIsFree(email: string): Promise<void> {
    const existing = await this.userRepository.findOneBy({ email });
    if (existing) throw new ConflictException(`Email ${email} is already registered`);
  }

  private handleDbError(error: unknown): never {
    const e = error as { code?: string; detail?: string };
    if (e?.code === '23505') throw new ConflictException(e.detail ?? 'Duplicate value');
    throw new InternalServerErrorException('Unexpected database error');
  }
}
