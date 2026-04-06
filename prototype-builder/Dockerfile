# Railway 배포용 — 모노리포 루트에서 빌드
# Railway Root Directory: / (프로젝트 루트)
# Docker Context: . (모노리포 전체)

FROM node:20-slim AS builder

RUN apt-get update -qq && apt-get install -y -qq git && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /build

# pnpm workspace + tsconfig 설정 복사
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.json ./

# shared + prototype-builder 패키지만 복사
COPY packages/shared/ ./packages/shared/
COPY prototype-builder/ ./prototype-builder/

# 의존성 설치 + 빌드
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @foundry-x/shared build
RUN pnpm --filter @foundry-x/prototype-builder build

# --- Runtime stage ---
FROM node:20-slim

RUN apt-get update -qq && apt-get install -y -qq git curl && rm -rf /var/lib/apt/lists/*

# Claude Code CLI + wrangler
RUN npm install -g @anthropic-ai/claude-code wrangler

WORKDIR /app

# 빌드 산출물 + 런타임 의존성만 복사
COPY --from=builder /build/prototype-builder/dist/ ./dist/
COPY --from=builder /build/prototype-builder/node_modules/ ./node_modules/
COPY --from=builder /build/prototype-builder/templates/ ./templates/
COPY --from=builder /build/prototype-builder/package.json ./
COPY --from=builder /build/packages/shared/dist/ ./node_modules/@foundry-x/shared/dist/
COPY --from=builder /build/packages/shared/package.json ./node_modules/@foundry-x/shared/

CMD ["node", "dist/index.js"]
