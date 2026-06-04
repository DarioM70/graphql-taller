# --- Build stage ---
FROM node:22-slim AS build
WORKDIR /app

# Build tools for native modules (bcrypt)
RUN apt-get update -y && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

# Drop dev dependencies but keep the compiled native modules (bcrypt).
RUN npm prune --omit=dev

# --- Runtime stage ---
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./

EXPOSE 9000

# TypeORM `synchronize` creates the schema on boot, so no migration step is needed.
CMD ["node", "dist/main.js"]
