# ── Stage 1: build the frontend ──────────────────────────────────────────────
FROM node:24-alpine AS frontend-builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
COPY backend/package.json ./backend/

RUN npm ci --workspace=frontend --ignore-scripts

COPY frontend ./frontend

RUN npm run build --workspace=frontend

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

RUN npm ci --workspace=backend --ignore-scripts

COPY backend ./backend

COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# The SNCB BikeOnTrain endpoint serves an incomplete TLS chain (it omits the
# DigiCert intermediate). Adding that intermediate to Node's CA bundle lets
# fetch verify the chain. See backend/certs/bikeontrain-intermediate.pem.
ENV NODE_EXTRA_CA_CERTS=/app/backend/certs/bikeontrain-intermediate.pem

WORKDIR /app/backend
CMD ["node", "--experimental-strip-types", "src/server.ts"]
