FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production=false

COPY . .
RUN npm run build

# ── Runtime ──
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache wget

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/db/migrations ./dist/db/migrations
COPY --from=builder /app/src/diff-engine/fixtures ./dist/diff-engine/fixtures

EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=5s --retries=5 CMD wget -qO- http://localhost:4000/healthz || exit 1

CMD ["node", "dist/index.js"]
