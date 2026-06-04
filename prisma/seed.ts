import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Seed an initial SUPERADMIN plus a sample regular user and project so the API
 * is demoable right after a fresh install. Idempotent: re-running it upserts.
 */
async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@taller.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin123*';
  const adminName = process.env.SEED_ADMIN_NAME || 'Super Admin';

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: adminName,
      email: adminEmail,
      password: await bcrypt.hash(adminPassword, 10),
      role: 'SUPERADMIN',
    },
  });

  const demo = await prisma.user.upsert({
    where: { email: 'user@taller.com' },
    update: {},
    create: {
      name: 'Demo User',
      email: 'user@taller.com',
      password: await bcrypt.hash('User123*', 10),
      role: 'USER',
    },
  });

  const existingProject = await prisma.project.findFirst({ where: { ownerId: demo.id } });
  if (!existingProject) {
    await prisma.project.create({
      data: {
        name: 'Demo Project',
        description: 'A sample project owned by the demo user',
        ownerId: demo.id,
        tasks: { create: [{ title: 'First task', status: 'TODO' }] },
        comments: { create: [{ content: 'Welcome to the project!', authorId: admin.id }] },
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(`Seed complete. Superadmin: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
