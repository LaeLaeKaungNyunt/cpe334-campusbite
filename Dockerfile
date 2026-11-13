# CampusBite unified production image

# Stage 1: Build
FROM node:24-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json

RUN npm ci

COPY . .

RUN npm run build

# Stage 2: Production
FROM node:24-bookworm-slim AS production

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/backend ./backend
COPY --from=builder --chown=node:node /app/frontend/package.json ./frontend/package.json
COPY --from=builder --chown=node:node /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
ENV PORT=8080
ENV TZ=Asia/Bangkok

EXPOSE 8080

USER node

CMD ["node", "backend/dist/server.js"]
