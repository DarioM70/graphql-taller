# Checklist de funcionalidades — Taller GraphQL (NestJS + TypeORM)

Mapeo de cada requisito y criterio de evaluación del enunciado con su
implementación. Sirve como guía de revisión.

## Requisitos funcionales

| Requisito                                                        | Estado | Dónde |
| ---------------------------------------------------------------- | :----: | ----- |
| Roles `superadmin` y `user`                                     | ✅ | `src/auth/enums/valid-roles.enum.ts`, `RolesGuard` |
| Superadmin crea / modifica / elimina usuarios                   | ✅ | `src/users/users.resolver.ts` (`@Roles`) |
| Usuarios autenticados ven la lista de usuarios                  | ✅ | `Query.users` (`GqlAuthGuard`) |
| Solo superadmin modifica/elimina usuarios                       | ✅ | `RolesGuard` + `@Roles(superadmin)` |
| CRUD de proyectos por su dueño (Módulo 1)                       | ✅ | `src/projects/` |
| Admin gestiona proyectos de cualquier usuario                   | ✅ | `ProjectsService.ensureCanManage` |
| Vínculo Módulo 1 ↔ Módulo 2 (Project → Task)                    | ✅ | `Task.project` (`@ManyToOne`), `src/tasks/` |
| CRUD de comentarios                                             | ✅ | `src/comments/` |
| Registro y autenticación con JWT                                | ✅ | `src/auth/` (`signup`/`login`, Passport-JWT) |
| Protección con middleware (guards) de auth/authz               | ✅ | `GqlAuthGuard`, `RolesGuard` |
| Operaciones requieren autenticación                            | ✅ | `@UseGuards(GqlAuthGuard)` en los resolvers |

## Criterios de evaluación

| Criterio (peso)                              | Estado | Evidencia |
| -------------------------------------------- | :----: | --------- |
| Consultas y Mutaciones (20%)                | ✅ | 8 queries + 14 mutations (code-first, `src/schema.gql`) |
| Manejo de Errores (10%)                     | ✅ | `formatError` + códigos tipados (`src/app.module.ts`) |
| Calidad del Código y TypeScript (10%)       | ✅ | NestJS modular, entidades/DTOs tipados, comentado |
| Funcionalidad y Validaciones (20%)          | ✅ | `class-validator` DTOs + `ValidationPipe` global |
| Despliegue (10%)                            | ✅ | **Live en Railway** + Postgres administrado · `Dockerfile` |
| Pruebas Supertest + Postman (15%)           | ✅ | 20 tests e2e (`test/`) + colección (`postman/`) |
| Seguridad en Auth/Authz (10%)               | ✅ | JWT + bcrypt + guards; password no expuesto en el schema |
| Documentación y Presentación (5%)           | ✅ | `README.md`, este archivo, `operations.graphql` |

## Cómo verificar rápidamente

1. `npm install && cp .env.example .env && docker compose up -d db`
2. `npm run test:e2e` → 20 pruebas en verde (PostgreSQL de pruebas).
3. `npm run start:dev` y abrir `http://localhost:9000/graphql` (Apollo Sandbox).
4. Pegar las operaciones de `operations.graphql` o importar la colección Postman.

### Flujo de demostración sugerido

1. `signup` (primer usuario) → se crea como `superadmin`; copiar `token`.
2. En Sandbox, agregar el header `Authorization: Bearer <token>`.
3. `createProject` → `createTask` → `createComment`.
4. `projects` → ver proyecto, tareas y comentarios anidados (ventaja GraphQL).
5. Probar autorización: registrar otro usuario (`user`) e intentar `createUser`
   → `FORBIDDEN`.
