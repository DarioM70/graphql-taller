import { execSync } from 'child_process';

/**
 * Runs once before the whole test suite. Resets a dedicated SQLite test
 * database (prisma/test.db) so tests run against a clean, isolated schema.
 */
export default async function globalSetup() {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

  execSync('npx prisma db push --skip-generate --force-reset', {
    stdio: 'ignore',
    env: process.env,
  });
}
