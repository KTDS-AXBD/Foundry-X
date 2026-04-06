# Railway 배포용 — 모노리포 루트에서 빌드
FROM node:20-slim AS builder

RUN apt-get update -qq && apt-get install -y -qq git && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /build

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.json ./
COPY packages/shared/ ./packages/shared/
COPY prototype-builder/ ./prototype-builder/

RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @foundry-x/shared build
RUN pnpm --filter @foundry-x/prototype-builder build

# --- Runtime stage ---
FROM node:20-slim

RUN apt-get update -qq && apt-get install -y -qq git curl && rm -rf /var/lib/apt/lists/*
RUN npm install -g @anthropic-ai/claude-code wrangler

WORKDIR /app

# 빌드 산출물 + package.json 복사
COPY --from=builder /build/prototype-builder/dist/ ./dist/
COPY --from=builder /build/prototype-builder/templates/ ./templates/
COPY --from=builder /build/prototype-builder/package.json ./
COPY --from=builder /build/packages/shared/dist/ ./shared-dist/

# npm으로 런타임 의존성 설치 (pnpm 심볼릭 링크 문제 회피)
RUN npm install --omit=dev @anthropic-ai/sdk && \
    mkdir -p node_modules/@foundry-x/shared/dist && \
    cp -r shared-dist/* node_modules/@foundry-x/shared/dist/ && \
    cp -r shared-dist/../package.json node_modules/@foundry-x/shared/ 2>/dev/null || true

# shared package.json 별도 복사
COPY --from=builder /build/packages/shared/package.json ./node_modules/@foundry-x/shared/

CMD ["node", "dist/index.js"]
