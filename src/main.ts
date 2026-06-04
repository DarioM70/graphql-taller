import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // REST routes (e.g. the health check) live under /api. GraphQL stays at /graphql.
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  // Railway/Render inject PORT; default to 9000 locally (course convention).
  const port = process.env.PORT ? +process.env.PORT : 9000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 GraphQL API ready at http://localhost:${port}/graphql`);
}
void bootstrap();
