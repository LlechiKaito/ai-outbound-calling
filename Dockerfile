FROM node:22-slim AS base
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY backend/ ./backend/
COPY frontend/ ./frontend/
COPY scripts/ ./scripts/

FROM base AS dev
CMD ["npm", "run", "dev"]

FROM base AS test
COPY jest.config.ts ./
COPY tests/ ./tests/
CMD ["npm", "test"]

FROM base AS build
RUN npm run build

FROM node:22-slim AS prod
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/backend/src/server.js"]
