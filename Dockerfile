# ── Stage 1: Build ───────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Production ─────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY prisma.config.ts ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY prisma ./prisma

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate resolve --rolled-back 20260430000001_align_posttype_enum || true && npx prisma migrate deploy && npm run start"]