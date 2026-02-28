FROM node:22-slim AS base
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY backend/ ./backend/
COPY scripts/ ./scripts/

FROM base AS dev
CMD ["npm", "run", "dev"]

FROM base AS test
COPY jest.config.ts ./
COPY tests/ ./tests/
CMD ["npm", "test"]
