import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'node:path';
import type { Request } from 'express';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { CommentsModule } from './comments/comments.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // GraphQL — code-first. The schema is generated from the resolvers/entities
    // into src/schema.gql. The Apollo sandbox is enabled for easy exploration.
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      introspection: true,
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()] as ApolloDriverConfig['plugins'],
      context: ({ req }: { req: Request }) => ({ req }),
      // Normalize errors: derive a stable extensions.code from the original HTTP
      // status (NestJS only maps some exceptions by default), surface validation
      // details, and strip internal stack traces.
      formatError: (formattedError) => {
        const ext = { ...(formattedError.extensions ?? {}) } as Record<string, unknown>;
        const original = ext.originalError as
          | { statusCode?: number; message?: string | string[] }
          | undefined;

        const statusToCode: Record<number, string> = {
          400: 'BAD_REQUEST',
          401: 'UNAUTHENTICATED',
          403: 'FORBIDDEN',
          404: 'NOT_FOUND',
          409: 'CONFLICT',
        };
        const status = original?.statusCode;
        const code =
          (status && statusToCode[status]) ||
          (ext.code as string) ||
          'INTERNAL_SERVER_ERROR';

        // Validation errors carry an array of messages; expose them as details.
        const details = Array.isArray(original?.message) ? original?.message : undefined;
        const message =
          status === 400 && details ? details.join('; ') : formattedError.message;

        delete ext.stacktrace;
        delete ext.originalError;

        return {
          message,
          path: formattedError.path,
          extensions: { ...ext, code, ...(details ? { details } : {}) },
        };
      },
    }),

    // PostgreSQL via TypeORM. `synchronize` auto-creates the schema on boot —
    // fine for this academic project; in real production use migrations.
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      autoLoadEntities: true,
      synchronize: true,
    }),

    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    CommentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
