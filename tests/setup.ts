import { prisma } from '../src/prisma';

/** Wipe all tables before each test for full isolation (FK-safe order). */
beforeEach(async () => {
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
