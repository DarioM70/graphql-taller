import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { ValidRoles } from './auth/enums/valid-roles.enum';

/**
 * Idempotent seed: creates the initial superadmin plus a demo regular user if
 * they don't exist yet. Run with `npm run seed`.
 */
async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@taller.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123*';
  const adminName = process.env.SEED_ADMIN_NAME ?? 'Super Admin';

  if (!(await usersService.findByEmail(adminEmail))) {
    await usersService.create({
      fullName: adminName,
      email: adminEmail,
      password: adminPassword,
      roles: [ValidRoles.superadmin],
    });
    // eslint-disable-next-line no-console
    console.log(`Seeded superadmin: ${adminEmail} / ${adminPassword}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`Superadmin ${adminEmail} already exists`);
  }

  if (!(await usersService.findByEmail('user@taller.com'))) {
    await usersService.create({
      fullName: 'Demo User',
      email: 'user@taller.com',
      password: 'User123*',
      roles: [ValidRoles.user],
    });
    // eslint-disable-next-line no-console
    console.log('Seeded demo user: user@taller.com / User123*');
  }

  await app.close();
}

void seed();
