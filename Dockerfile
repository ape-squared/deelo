# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl \
  && ARCH="$(uname -m)" \
  && case "$ARCH" in \
    aarch64|arm64) YTDLP_ASSET=yt-dlp_linux_aarch64 ;; \
    *) YTDLP_ASSET=yt-dlp_linux ;; \
  esac \
  && curl -L "https://github.com/yt-dlp/yt-dlp/releases/latest/download/${YTDLP_ASSET}" \
    -o /app/yt-dlp-bin \
  && chmod a+rx /app/yt-dlp-bin \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd --system deelo && useradd --system --gid deelo --create-home deelo

COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN chown -R deelo:deelo /app
USER deelo

CMD ["node", "dist/index.js"]
