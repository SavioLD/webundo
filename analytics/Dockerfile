# ── Build-Stage: Abhängigkeiten installieren + TypeScript kompilieren ────────
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Build-Tools für native Module (better-sqlite3).
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build \
    # tsc kopiert keine Nicht-TS-Assets -> Schema neben die kompilierte DB-Logik legen.
    && cp src/db/schema.sql dist/db/schema.sql

# Dev-Abhängigkeiten entfernen (native better-sqlite3-Bindings bleiben erhalten).
RUN npm prune --omit=dev

# ── Runtime-Stage: schlankes Laufzeit-Image ─────────────────────────────────
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Nur das Nötige aus der Build-Stage übernehmen.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY public ./public
COPY tracker ./tracker
COPY config ./config

# Datenverzeichnis (per Volume überschreibbar).
RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]
ENV DATABASE_PATH=/data/analytics.db
EXPOSE 4000

# Migration läuft implizit beim Start (getDb()); Container startet den Server.
CMD ["node", "dist/index.js"]
