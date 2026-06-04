# Taller Backend — NestJS + GraphQL

API GraphQL construida con **NestJS + TypeORM** (GraphQL *code-first*) que
reemplaza una API REST para la gestión de **usuarios, proyectos (Módulo 1),
tareas (Módulo 2)** y **comentarios**, con autenticación **JWT (Passport)** y
autorización por **roles** (`superadmin`, `user`).

> Computación en Internet III — Universidad Icesi.

## 🌐 Despliegue en producción (Railway)

- **API GraphQL:** https://graphql-taller-production.up.railway.app/graphql
- **Health check:** https://graphql-taller-production.up.railway.app/api/health
- **Repositorio:** https://github.com/DarioM70/graphql-taller

El primer usuario que se registre (`signup`) se convierte en `superadmin`.

---

## 1. Stack tecnológico

| Componente        | Tecnología                                   |
| ----------------- | -------------------------------------------- |
| Framework         | **NestJS 11**                                |
| GraphQL           | `@nestjs/graphql` + `@nestjs/apollo` (code-first) |
| ORM / Base de datos | **TypeORM** + **PostgreSQL**               |
| Autenticación     | `@nestjs/passport` + `passport-jwt` + `bcrypt` |
| Validación        | `class-validator` / `class-transformer` (`ValidationPipe`) |
| Pruebas           | Jest + Supertest (e2e)                        |

GraphQL es **code-first**: el esquema (`src/schema.gql`) se genera a partir de
las entidades/resolvers decorados con `@ObjectType`/`@Field`.

---

## 2. Modelo de datos

```
User 1 ──< Project 1 ──< Task
                  │
                  └──< Comment >── User (autor)
```

- **User**: `id (uuid), fullName, email (único), password (hash, no expuesto),
  roles: string[], isActive`.
- **Project** (Módulo 1): pertenece a un `User` (owner).
- **Task** (Módulo 2): vinculada a un `Project`, con `status` (`TODO`,
  `IN_PROGRESS`, `DONE`) y un `assignee` opcional.
- **Comment**: escrito por un `User` sobre un `Project`.

Entidades doble-decoradas (`@Entity` de TypeORM + `@ObjectType` de GraphQL).

---

## 3. Requisitos previos

- Node.js 18+ (probado con Node 22)
- npm
- Docker (para la base PostgreSQL local; o un Postgres propio)

---

## 4. Configuración y ejecución local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de entorno
cp .env.example .env

# 3. Levantar PostgreSQL local (crea las BD `graphql_taller` y `..._test`)
docker compose up -d db

# 4. Levantar el servidor en modo desarrollo (TypeORM crea las tablas solo)
npm run start:dev

# 5. (Opcional) Cargar el superadmin + usuario demo
npm run seed
```

El servidor queda disponible en:

- **GraphQL:** `http://localhost:9000/graphql` (Apollo Sandbox en el navegador)
- **Health check:** `http://localhost:9000/api/health`

Con `npm run seed` se crean:

| Rol         | Email              | Contraseña  |
| ----------- | ------------------ | ----------- |
| superadmin  | `admin@taller.com` | `Admin123*` |
| user        | `user@taller.com`  | `User123*`  |

### Scripts disponibles

| Script              | Descripción                                  |
| ------------------- | -------------------------------------------- |
| `npm run start:dev` | Servidor con recarga en caliente             |
| `npm run build`     | Compila a `dist/` (`nest build`)             |
| `npm run start:prod`| Ejecuta la versión compilada                 |
| `npm run seed`      | Carga datos iniciales                        |
| `npm run test:e2e`  | Pruebas e2e (Jest + Supertest)               |

---

## 5. Autenticación y autorización

1. Registre un usuario con la mutación `signup` (el **primer usuario** del
   sistema se convierte en `superadmin`; los siguientes son `user`).
2. La respuesta incluye un **token JWT**.
3. Envíe el token en cada operación protegida:

```
Authorization: Bearer <token>
```

La autorización se implementa con guards de NestJS:

- `GqlAuthGuard` (Passport-JWT) protege todas las operaciones excepto
  `signup` y `login`.
- `RolesGuard` + `@Roles(ValidRoles.superadmin)` restringe la gestión de usuarios.
- La propiedad de proyectos/tareas/comentarios se valida en los servicios.

### Reglas de autorización

| Acción                                   | user (dueño) | user (otro) | superadmin |
| ---------------------------------------- | :----------: | :---------: | :--------: |
| Ver lista de usuarios                    | ✅           | ✅          | ✅         |
| Crear / editar / eliminar usuarios       | ❌           | ❌          | ✅         |
| Crear proyectos                          | ✅           | ✅          | ✅         |
| Editar / eliminar **su** proyecto        | ✅           | ❌          | ✅         |
| Editar / eliminar proyecto **ajeno**     | —            | ❌          | ✅         |
| Crear / editar / eliminar tareas         | ✅ (de su proyecto) | ❌    | ✅         |
| Comentar en cualquier proyecto           | ✅           | ✅          | ✅         |
| Editar / eliminar comentario propio      | ✅           | ❌          | ✅         |

---

## 6. API GraphQL — Operaciones

### Queries

| Query                  | Descripción                                  |
| ---------------------- | -------------------------------------------- |
| `me`                   | Usuario autenticado actual                   |
| `users`                | Lista de usuarios                            |
| `user(id)`             | Un usuario por id                            |
| `projects(mine)`       | Proyectos (admin: todos; user: propios)      |
| `project(id)`          | Un proyecto por id                           |
| `tasks(projectId)`     | Tareas de un proyecto                        |
| `task(id)`             | Una tarea por id                             |
| `comments(projectId)`  | Comentarios de un proyecto                   |

### Mutations

| Mutation                          | Permiso                          |
| --------------------------------- | -------------------------------- |
| `signup(input)` / `login(input)`  | Público                          |
| `createUser / updateUser / deleteUser` | Solo `superadmin`           |
| `createProject`                   | Autenticado                      |
| `updateProject / deleteProject`   | Dueño o `superadmin`            |
| `createTask / updateTask / deleteTask` | Dueño del proyecto o `superadmin` |
| `createComment`                   | Autenticado                      |
| `updateComment / deleteComment`   | Autor o `superadmin`            |

### Ejemplos

```graphql
mutation {
  signup(input: { fullName: "Ada", email: "ada@taller.com", password: "Secret123*" }) {
    token
    user { id email roles }
  }
}
```

Consulta anidada (GraphQL evita el over-fetching del REST):

```graphql
query {
  projects {
    name
    owner { email }
    tasks { title status assignee { email } }
    comments { content author { email } }
  }
}
```

Más operaciones listas para pegar en el Sandbox: `operations.graphql`.

---

## 7. Manejo de errores

Un `formatError` normaliza cada error: deriva un `extensions.code` estable a
partir del status HTTP de la excepción de Nest y oculta los stack traces.

| Código              | Excepción Nest             | HTTP |
| ------------------- | -------------------------- | ---- |
| `UNAUTHENTICATED`   | `UnauthorizedException`    | 401  |
| `FORBIDDEN`         | `ForbiddenException`       | 403  |
| `NOT_FOUND`         | `NotFoundException`        | 404  |
| `BAD_REQUEST`       | `ValidationPipe` / `BadRequestException` (incluye `details`) | 400 |
| `CONFLICT`          | `ConflictException`        | 409  |

---

## 8. Despliegue en la nube — Railway (activo)

La aplicación **ya está desplegada en Railway** con **PostgreSQL administrado**:
https://graphql-taller-production.up.railway.app/graphql

### Cómo se desplegó

- **PostgreSQL administrado de Railway** (servicio `Postgres` del proyecto).
- Imagen construida desde el `Dockerfile` (NestJS; config en `railway.toml`).
- Variables: `JWT_SECRET`, `JWT_EXPIRES_IN`, `NODE_ENV`, y `DATABASE_URL`
  (referencia a `${{Postgres.DATABASE_URL}}`, red privada interna).
- TypeORM con `synchronize: true` crea el esquema al arrancar (sin migraciones).

Redespliegue manual desde la máquina local: `railway up --service graphql-taller`.

### CI/CD

- **CI — GitHub Actions** (`.github/workflows/ci.yml`): en cada push compila
  (`nest build`) y corre las pruebas e2e contra un **Postgres** efímero (service
  container). Actúa como *quality gate*.
- **CD — Railway (integración nativa de GitHub):** al conectar el servicio al
  repositorio (*Service → Settings → Source → Connect Repo*), Railway redespliega
  automáticamente en cada push a `main`.

### Despliegue alternativo (Render / Docker)

Se incluye `render.yaml` (provisiona Postgres + servicio web). El `Dockerfile`
corre en cualquier entorno apuntando `DATABASE_URL` a un Postgres accesible.

---

## 9. Pruebas

```bash
docker compose up -d db   # PostgreSQL local (incluye la BD de pruebas)
npm run test:e2e
```

- **20 pruebas e2e** con **Jest + Supertest** que ejercitan el endpoint GraphQL
  real (HTTP) sobre una base PostgreSQL de pruebas aislada (`graphql_taller_test`).
- Cubren autenticación, roles, CRUD de las cuatro entidades, validaciones y
  todos los códigos de error.

### Postman / Newman

Importe `postman/graphql-taller.postman_collection.json`. El request **Signup**
(o **Login**) guarda el token en `{{token}}` y el resto lo reutiliza.

```bash
# Contra producción (Railway) — 19 requests, 0 errores
npx newman run postman/graphql-taller.postman_collection.json \
  -e postman/production.postman_environment.json

# Contra local (requiere `npm run start:dev`)
npx newman run postman/graphql-taller.postman_collection.json
```

---

## 10. Estructura del proyecto

```
src/
  main.ts                # Bootstrap (ValidationPipe, prefijo /api, CORS)
  app.module.ts          # GraphQLModule (code-first) + TypeOrmModule + módulos
  health.controller.ts   # GET /api/health
  seed.ts                # Datos iniciales
  auth/                  # JWT strategy, GqlAuthGuard, RolesGuard, decoradores
  users/                 # entity, service, resolver, DTOs
  projects/              # entity, service, resolver, DTOs  (Módulo 1)
  tasks/                 # entity, service, resolver, DTOs  (Módulo 2)
  comments/              # entity, service, resolver, DTOs
test/                    # Pruebas e2e (Jest + Supertest)
postman/                 # Colección + environment de producción
docker-compose.yml       # PostgreSQL local (dev + tests)
Dockerfile, railway.toml, render.yaml
```

---

## 11. Funcionalidades no desarrolladas / dificultades

- **`synchronize: true`:** TypeORM crea/actualiza el esquema en el arranque, lo
  que simplifica el despliegue. En un entorno productivo real se usarían
  migraciones de TypeORM en lugar de `synchronize`.
- **Reacciones:** el enunciado las menciona de forma opcional; no se implementó
  un módulo independiente de reacciones (los comentarios cubren la interacción
  social requerida). Es una extensión natural siguiendo el patrón de `Comment`.
