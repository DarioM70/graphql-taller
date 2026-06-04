import { ConflictException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { Project } from '../projects/entities/project.entity';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ValidRoles } from '../auth/enums/valid-roles.enum';

@Resolver(() => User)
@UseGuards(GqlAuthGuard)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  @Query(() => User, { name: 'me', description: 'Current authenticated user' })
  me(@CurrentUser() user: User): User {
    return user;
  }

  @Query(() => [User], { name: 'users', description: 'List all users' })
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @Query(() => User, { name: 'user' })
  findOne(@Args('id', { type: () => ID }) id: string): Promise<User> {
    return this.usersService.findOneById(id);
  }

  @Mutation(() => User, { name: 'createUser', description: 'Superadmin only' })
  @UseGuards(RolesGuard)
  @Roles(ValidRoles.superadmin)
  createUser(@Args('input') input: CreateUserInput): Promise<User> {
    return this.usersService.create(input);
  }

  @Mutation(() => User, { name: 'updateUser', description: 'Superadmin only' })
  @UseGuards(RolesGuard)
  @Roles(ValidRoles.superadmin)
  updateUser(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateUserInput,
  ): Promise<User> {
    return this.usersService.update(id, input);
  }

  @Mutation(() => Boolean, { name: 'deleteUser', description: 'Superadmin only' })
  @UseGuards(RolesGuard)
  @Roles(ValidRoles.superadmin)
  async deleteUser(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() current: User,
  ): Promise<boolean> {
    if (current.id === id) throw new ConflictException('You cannot delete your own account');
    await this.usersService.remove(id);
    return true;
  }

  @ResolveField(() => [Project], { name: 'projects' })
  projects(@Parent() user: User): Promise<Project[]> {
    return this.projectRepository.find({
      where: { owner: { id: user.id } },
      order: { createdAt: 'ASC' },
    });
  }
}
