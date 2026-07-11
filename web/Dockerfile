# syntax=docker/dockerfile:1
# Build context must be the repository root (see docker-compose.yml) so git history
# is available for generate-releases.mjs during prebuild.

FROM node:22-bookworm-slim AS deps
WORKDIR /workspace/web
COPY web/package.json web/package-lock.json ./
RUN npm ci

FROM deps AS builder
WORKDIR /workspace

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_DISCORD_CLIENT_ID
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_DISCORD_CLIENT_ID=$NEXT_PUBLIC_DISCORD_CLIENT_ID \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY .git ./.git
COPY web ./web
WORKDIR /workspace/web
COPY --from=deps /workspace/web/node_modules ./node_modules
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system deelo && useradd --system --gid deelo --create-home deelo

COPY --from=builder /workspace/web/public ./public
COPY --from=builder --chown=deelo:deelo /workspace/web/.next/standalone ./
COPY --from=builder --chown=deelo:deelo /workspace/web/.next/static ./.next/static

USER deelo
EXPOSE 3000

CMD ["node", "server.js"]
