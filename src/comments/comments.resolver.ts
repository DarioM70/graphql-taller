import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';
import { CreateCommentInput } from './dto/create-comment.input';
import { UpdateCommentInput } from './dto/update-comment.input';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Resolver(() => Comment)
@UseGuards(GqlAuthGuard)
export class CommentsResolver {
  constructor(private readonly commentsService: CommentsService) {}

  @Mutation(() => Comment, { name: 'createComment' })
  createComment(
    @Args('input') input: CreateCommentInput,
    @CurrentUser() user: User,
  ): Promise<Comment> {
    return this.commentsService.create(input, user);
  }

  @Query(() => [Comment], { name: 'comments', description: 'Comments of a project' })
  findByProject(
    @Args('projectId', { type: () => ID }) projectId: string,
  ): Promise<Comment[]> {
    return this.commentsService.findByProject(projectId);
  }

  @Mutation(() => Comment, { name: 'updateComment' })
  updateComment(
    @Args('id', { type: () => ID }) id: string,
    @Args('input') input: UpdateCommentInput,
    @CurrentUser() user: User,
  ): Promise<Comment> {
    return this.commentsService.update(id, input, user);
  }

  @Mutation(() => Boolean, { name: 'deleteComment' })
  deleteComment(
    @Args('id', { type: () => ID }) id: string,
    @CurrentUser() user: User,
  ): Promise<boolean> {
    return this.commentsService.remove(id, user);
  }
}
