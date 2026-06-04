import { SetMetadata } from '@nestjs/common';
import { ValidRoles } from '../enums/valid-roles.enum';

export const ROLES_KEY = 'roles';

/** Marks a resolver/handler as requiring one of the given roles (see RolesGuard). */
export const Roles = (...roles: ValidRoles[]) => SetMetadata(ROLES_KEY, roles);
