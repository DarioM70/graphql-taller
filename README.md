# Taller Backend — Node.js + GraphQL

API GraphQL construida con **Node.js + TypeScript** que reemplaza una API REST
para la gestión de **usuarios, proyectos (Módulo 1), tareas (Módulo 2)** y
**comentarios**, con autenticación **JWT** y autorización por **roles**
(`SUPERADMIN`, `USER`).

> Computación en Internet III — Universidad Icesi.

## 🌐 Despliegue en producción (Railway)

- **API GraphQL:** https://graphql-taller-production.up.railway.app/graphql
- **Health check:** https://graphql-taller-production.up.railway.app/health
- **Repositorio:** https://github.com/DarioM70/graphql-taller

El primer usuario que se registre en producción se convierte en `SUPERADMIN`.

---

## 1. Stack tecnológico

| Componente        | Tecnología                          |
| ----------------- | ----------------------------------- |
| Lenguaje          | TypeScript                          |
| Servidor HTTP     | Express 4                           |
| GraphQL           | Apollo Server 4 (`@apollo/server`)  |
| ORM / Base de datos | Prisma + **PostgreSQL**            |
| Autenticación     | JWT (`jsonwebtoken`) + `bcryptjs`   |
| Validación        | Zod                                 |
| Pruebas           | Jest + Supertest                    |

La base de datos es **PostgreSQL** en todos los entornos. Para desarrollo y
pruebas se levanta con Docker (`docker compose up -d db`); en producción se usa
el **Postgres administrado de Railway** (ver sección 8).

---

## 2. Modelo de datos

```
User 1 ──< Project 1 ──< Task
                  │
                  └──< Comment >── User (autor)
```

- **User**: `id, name, email, password (hash), role`.
- **Project** (Módulo 1): pertenece a un `User` (owner).
- **Task** (Módulo 2): vinculada a un `Project`, con `status` (`TODO`,
  `IN_PROGRESS`, `DONE`) y un `assignee` opcional.
- **Comment**: escrito por un `User` sobre un `Project`.

---

## 3. Requisitos previos

- Node.js 18+ (probado con Node 22/26)
- npm
- Docker (para la base PostgreSQL local; o un Postgres propio)

---

## 4. Configuración y ejecución local

```bash
# 1. Instalar dependencias (genera el cliente Prisma automáticamente)
npm install

# 2. Crear el archivo de entorno
cp .env.example .env

# 3. Levantar PostgreSQL local (crea las BD `graphql_taller` y `..._test`)
docker compose up -d db

# 4. Crear las tablas a partir del esquema Prisma
npm run db:push

# 5. (Opcional) Cargar datos de ejemplo + superadmin inicial
npm run seed

# 6. Levantar el servidor en modo desarrollo (hot reload)
npm run dev
```

El servidor queda disponible en:

- **GraphQL:** `http://localhost:4000/graphql`
- **Health check:** `http://localhost:4000/health`

Con `npm run seed` se crean:

| Rol        | Email              | Contraseña |
| ---------- | ------------------ | ---------- |
| SUPERADMIN | `admin@taller.com` | `Admin123*` |
| USER       | `user@taller.com`  | `User123*`  |

### Scripts disponibles

| Script              | Descripción                                  |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Servidor con recarga en caliente (tsx)       |
| `npm run build`     | Compila TypeScript a `dist/`                 |
| `npm start`         | Ejecuta la versión compilada                 |
| `npm run db:push`   | Sincroniza el esquema Prisma con la BD       |
| `npm run seed`      | Carga datos iniciales                        |
| `npm test`          | Ejecuta las pruebas (Jest + Supertest)       |

---

## 5. Autenticación y autorización

1. Cree un usuario con `register` (el **primer usuario registrado** del sistema
   se convierte en `SUPERADMIN`; los siguientes son `USER`).
2. La respuesta incluye un **token JWT**.
3. Envíe el token en cada petición protegida mediante el header:

```
Authorization: Bearer <token>
```

### Reglas de autorización

| Acción                                   | USER (dueño) | USER (otro) | SUPERADMIN |
| ---------------------------------------- | :----------: | :---------: | :--------: |
| Ver lista de usuarios                    | ✅           | ✅          | ✅         |
| Crear / editar / eliminar usuarios       | ❌           | ❌          | ✅         |
| Crear proyectos                          | ✅           | ✅          | ✅         |
| Editar / eliminar **su** proyecto        | ✅           | ❌          | ✅         |
| Editar / eliminar proyecto **ajeno**     | —            | ❌          | ✅         |
| Crear / editar / eliminar tareas         | ✅ (de su proyecto) | ❌    | ✅         |
| Comentar en cualquier proyecto           | ✅           | ✅          | ✅         |
| Editar / eliminar comentario propio      | ✅           | ❌          | ✅         |

Toda operación (excepto `register` y `login`) requiere estar autenticado.

---

## 6. API GraphQL — Operaciones

### Queries

| Query                       | Descripción                                       |
| --------------------------- | ------------------------------------------------- |
| `me`                        | Usuario autenticado actual                        |
| `users`                     | Lista de usuarios                                 |
| `user(id)`                  | Un usuario por id                                 |
| `projects(mine)`            | Proyectos (admin: todos; user: propios)           |
| `project(id)`               | Un proyecto por id                                |
| `tasks(projectId)`          | Tareas de un proyecto                             |
| `task(id)`                  | Una tarea por id                                  |
| `comments(projectId)`       | Comentarios de un proyecto                        |

### Mutations

| Mutation                          | Permiso                          |
| --------------------------------- | -------------------------------- |
| `register(input)`                 | Público                          |
| `login(input)`                    | Público                          |
| `createUser / updateUser / deleteUser` | Solo `SUPERADMIN`           |
| `createProject`                   | Autenticado                      |
| `updateProject / deleteProject`   | Dueño o `SUPERADMIN`             |
| `createTask / updateTask / deleteTask` | Dueño del proyecto o `SUPERADMIN` |
| `createComment`                   | Autenticado                      |
| `updateComment / deleteComment`   | Autor o `SUPERADMIN`            |

### Ejemplos

**Registro / Login**

```graphql
mutation {
  register(input: { name: "Ada", email: "ada@taller.com", password: "Secret123*" }) {
    token
    user { id email role }
  }
}
```

**Crear proyecto** (header `Authorization: Bearer <token>`)

```graphql
mutation {
  createProject(input: { name: "Mi proyecto", description: "Demo" }) {
    id
    name
    owner { email }
  }
}
```

**Consulta anidada** (GraphQL evita el over-fetching del REST):

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

---

## 7. Manejo de errores

Cada error expone un código estable en `extensions.code`:

| Código                  | Significado                            | HTTP |
| ----------------------- | -------------------------------------- | ---- |
| `UNAUTHENTICATED`       | Falta token o credenciales inválidas   | 401  |
| `FORBIDDEN`             | Sin permisos para la acción            | 403  |
| `NOT_FOUND`             | Recurso inexistente                    | 404  |
| `BAD_USER_INPUT`        | Validación fallida (incluye `details`) | 400  |
| `CONFLICT`              | Recurso duplicado / regla de negocio   | 409  |

Ejemplo de error de validación:

```json
{
  "errors": [{
    "message": "Validation failed",
    "extensions": {
      "code": "BAD_USER_INPUT",
      "details": [{ "field": "email", "message": "A valid email is required" }]
    }
  }]
}
```

---

## 8. Despliegue en la nube — Railway (activo)

La aplicación **ya está desplegada en Railway**:
https://graphql-taller-production.up.railway.app/graphql

### Cómo se desplegó

- **PostgreSQL administrado de Railway** (servicio `Postgres` del proyecto).
- Imagen construida desde el `Dockerfile` (config en `railway.toml`).
- Variables de entorno en Railway: `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN` y
  `DATABASE_URL` (referencia a `${{Postgres.DATABASE_URL}}`, red privada interna).
- Comando de arranque (en el `Dockerfile`): `prisma db push` + `node dist/src/index.js`.

Para volver a desplegar manualmente desde la máquina local:

```bash
railway up --service graphql-taller
```

### CI/CD

- **CI — GitHub Actions** (`.github/workflows/ci.yml`): en cada push y PR
  instala dependencias, compila TypeScript y corre las 39 pruebas. Actúa como
  *quality gate*.
- **CD — Railway (integración nativa de GitHub):** al conectar el servicio al
  repositorio (*Service → Settings → Source → Connect Repo*), Railway construye
  el `Dockerfile` y **redespliega automáticamente en cada push a `main`**, sin
  necesidad de tokens en GitHub.

### Despliegue alternativo (Render / Docker local)

También se incluye `render.yaml` (Render Blueprint) que provisiona un Postgres
administrado y conecta el servicio web. El `Dockerfile` corre en cualquier
entorno apuntando `DATABASE_URL` a un Postgres accesible:

```bash
docker compose up -d db   # Postgres local
docker build -t graphql-taller .
docker run -p 4000:4000 \
  -e JWT_SECRET=cambia_esto \
  -e DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/graphql_taller" \
  graphql-taller
```

---

## 9. Pruebas

```bash
npm test
```

- **39 pruebas** con **Jest + Supertest** que ejercitan el endpoint GraphQL
  real (HTTP) sobre una base PostgreSQL de pruebas aislada (`graphql_taller_test`).
- Requieren el Postgres local: `docker compose up -d db` antes de `npm test`.
- Cubren autenticación, roles, CRUD de las cuatro entidades, validaciones y
  todos los códigos de error.

### Postman / Newman

Importe `postman/graphql-taller.postman_collection.json`. El request **Login**
(o **Register**) guarda el token en la variable `{{token}}` y el resto de
requests lo reutiliza automáticamente, encadenando `projectId`, `taskId`, etc.

- **Local:** la variable `baseUrl` apunta por defecto a `http://localhost:4000/graphql`.
- **Producción:** use el environment `postman/production.postman_environment.json`.

Ejecución por línea de comandos con **Newman** (runner CLI de Postman):

```bash
# Contra producción (Railway) — 19 requests, 0 errores
npx newman run postman/graphql-taller.postman_collection.json \
  -e postman/production.postman_environment.json

# Contra local (requiere npm run dev en otra terminal)
npx newman run postman/graphql-taller.postman_collection.json
```

> La colección corre de principio a fin sobre una base limpia: registra el
> superadmin, ejerce todo el CRUD de las cuatro entidades y deja la base
> limpia (folder **Cleanup**).

---

## 10. Estructura del proyecto

```
src/
  index.ts             # Punto de entrada (arranca el servidor)
  server.ts            # Express + Apollo + formatError
  context.ts           # Contexto por request (resuelve el usuario del JWT)
  prisma.ts            # Cliente Prisma compartido
  auth/                # jwt.ts, password.ts
  schema/typeDefs.ts   # Esquema GraphQL (SDL)
  resolvers/           # auth, user, project, task, comment + index
  utils/               # errors.ts, authz.ts, validation.ts (Zod)
prisma/
  schema.prisma        # Modelo de datos
  seed.ts              # Datos iniciales
tests/                 # Suite Jest + Supertest (Postgres)
postman/               # Colección Postman + environment de producción
docker-compose.yml     # PostgreSQL local (dev + tests)
Dockerfile, railway.toml, render.yaml
```

---

## 11. Funcionalidades no desarrolladas / dificultades

- **Base de datos:** el proyecto usa **PostgreSQL** en todos los entornos
  (Railway administrado en producción; Docker en local/CI), con enums nativos
  `Role` y `TaskStatus`. Inicialmente se prototipó con SQLite por su cero
  configuración, pero se migró a Postgres para una persistencia nativa en la
  nube y un entorno más cercano a producción.
- **Reacciones:** el enunciado las menciona de forma opcional; no se implementó
  un módulo de reacciones independiente (los comentarios cubren la interacción
  social requerida). Es una extensión natural siguiendo el patrón de `Comment`.
