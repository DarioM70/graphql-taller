import { PrismaClient } from '@prisma/client';

// Single shared Prisma client instance for the whole app.
// Logged queries are disabled in test to keep output clean.
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
