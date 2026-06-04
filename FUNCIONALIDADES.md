# Checklist de funcionalidades — Taller GraphQL

Mapeo de cada requisito y criterio de evaluación del enunciado con su
implementación en el código. Sirve como guía de revisión.

## Requisitos funcionales

| Requisito                                                        | Estado | Dónde |
| ---------------------------------------------------------------- | :----: | ----- |
| Roles `SUPERADMIN` y `USER`                                      | ✅ | `prisma/schema.prisma`, `src/utils/authz.ts` |
| Superadmin crea / modifica / elimina usuarios                   | ✅ | `src/resolvers/user.resolvers.ts` |
| Usuarios autenticados ven la lista de usuarios                  | ✅ | `Query.users` |
| Solo superadmin modifica/elimina usuarios                       | ✅ | `requireSuperadmin` |
| CRUD de proyectos por su dueño (Módulo 1)                       | ✅ | `src/resolvers/project.resolvers.ts` |
| Admin gestiona proyectos de cualquier usuario                   | ✅ | `requireOwnerOrAdmin` |
| Vínculo Módulo 1 ↔ Módulo 2 (Project → Task)                    | ✅ | `Task.projectId`, `src/resolvers/task.resolvers.ts` |
| CRUD de comentarios                                             | ✅ | `src/resolvers/comment.resolvers.ts` |
| Registro y autenticación con JWT                                | ✅ | `src/auth/jwt.ts`, `register`/`login` |
| Protección de operaciones con auth/authz (equivalente a middleware) | ✅ | `src/context.ts`, `src/utils/authz.ts` |
| Operaciones requieren autenticación                            | ✅ | `requireAuth` en todos los resolvers |

## Criterios de evaluación

| Criterio (peso)                              | Estado | Evidencia |
| -------------------------------------------- | :----: | --------- |
| Consultas y Mutaciones (20%)                | ✅ | 8 queries + 14 mutations — `src/schema/typeDefs.ts` |
| Manejo de Errores (10%)                     | ✅ | Códigos tipados — `src/utils/errors.ts`, `formatError` en `src/server.ts` |
| Calidad del Código y TypeScript (10%)       | ✅ | `strict: true`, tipado fuerte, comentarios, módulos separados |
| Funcionalidad y Validaciones (20%)          | ✅ | Validación con Zod — `src/utils/validation.ts` |
| Despliegue (10%)                            | ✅ | **Live en Railway:** https://graphql-taller-production.up.railway.app/graphql · CI/CD en `.github/workflows/ci.yml` |
| Pruebas Supertest + Postman (15%)           | ✅ | 39 tests (`tests/`) + colección (`postman/`) |
| Seguridad en Auth/Authz (10%)               | ✅ | JWT + bcrypt + guards por rol y propiedad |
| Documentación y Presentación (5%)           | ✅ | `README.md`, este archivo, `operations.graphql` |

## Cómo verificar rápidamente

1. `npm install && cp .env.example .env && docker compose up -d db && npm run db:push && npm run seed`
2. `npm test` → 39 pruebas en verde (PostgreSQL de pruebas).
3. `npm run dev` y abrir `http://localhost:4000/graphql` (Apollo Sandbox).
4. Pegar las operaciones de `operations.graphql` o importar la colección Postman.

### Flujo de demostración sugerido

1. `login` con `admin@taller.com / Admin123*` → copiar `token`.
2. En Sandbox, agregar el header `Authorization: Bearer <token>`.
3. `projects` → ver proyecto, tareas y comentarios anidados (ventaja GraphQL).
4. `createProject` → `createTask` → `createComment`.
5. Probar autorización: registrar un `USER` e intentar `deleteUser` → `FORBIDDEN`.
