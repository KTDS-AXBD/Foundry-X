# Railway 배포용 — 단일 스테이지 (모듈 해석 문제 회피)
FROM node:20-slim

RUN apt-get update -qq && apt-get install -y -qq git curl && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN npm install -g @anthropic-ai/claude-code wrangler

WORKDIR /app

# 모노리포 필수 파일 복사
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.json ./
COPY packages/shared/ ./packages/shared/
COPY prototype-builder/ ./prototype-builder/

# 의존성 설치 + 빌드
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @foundry-x/shared build
RUN pnpm --filter @foundry-x/prototype-builder build

WORKDIR /app/prototype-builder

CMD ["node", "dist/index.js"]
