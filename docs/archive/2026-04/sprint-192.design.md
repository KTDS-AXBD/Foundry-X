---
code: FX-DSGN-S192
title: Sprint 192 Design — F407 Gate-X Web UI + F408 다중 AI 모델
version: "1.0"
status: Active
category: DSGN
created: 2026-04-07
updated: 2026-04-07
author: Claude (Autopilot)
sprint: 192
f-items: [F407, F408]
---

# Sprint 192 Design — Gate-X Web UI + 다중 AI 모델

## 1. 아키텍처 개요

```
┌─────────────────────────────────────────────────────┐
│  packages/gate-x-web/ (F407 — 신규)                 │
│  Vite + React 18, Cloudflare Pages                  │
│  5 routes: /, /pipelines, /pipelines/:id,           │
│             /reports, /settings                     │
│         ↕ REST API (VITE_GATE_X_API_URL)            │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│  packages/gate-x/ (F408 — 기존 패키지 확장)          │
│  Hono Workers                                        │
│  + src/services/llm/  ← 신규                        │
│    types.ts, registry.ts, index.ts                  │
│    providers/: anthropic.ts, openai.ts, google.ts   │
│  + ogd-queue-worker.ts  ← stub→callLLM() 교체       │
└─────────────────────────────────────────────────────┘
              │ Fallback Chain
              ▼
        Anthropic → OpenAI → Google
```

## 2. F408 — LLM 추상화 레이어 상세 설계

### 2.1 인터페이스 (src/services/llm/types.ts)

```typescript
export interface LLMRequest {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  text: string;
  provider: 'anthropic' | 'openai' | 'google';
  model: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface LLMProvider {
  name: 'anthropic' | 'openai' | 'google';
  call(req: LLMRequest, apiKey: string): Promise<LLMResponse>;
}

export interface LLMConfig {
  /** 폴백 순서 — 앞에서부터 순서대로 시도 */
  providerOrder: ('anthropic' | 'openai' | 'google')[];
  defaultMaxTokens: number;
}
```

### 2.2 Anthropic Provider (src/services/llm/providers/anthropic.ts)

```typescript
// messages API (claude-sonnet-4-5)
// POST https://api.anthropic.com/v1/messages
// Authorization: x-api-key: {key}
// anthropic-version: 2023-06-01
```

### 2.3 OpenAI Provider (src/services/llm/providers/openai.ts)

```typescript
// chat completions (gpt-4o-mini — 비용 효율)
// POST https://api.openai.com/v1/chat/completions
// Authorization: Bearer {key}
```

### 2.4 Google Provider (src/services/llm/providers/google.ts)

```typescript
// Gemini API (gemini-1.5-flash — 빠른 응답)
// POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
// ?key={key}
```

### 2.5 Registry (src/services/llm/registry.ts)

폴백 체인 로직:
1. `providerOrder` 순서대로 시도
2. 성공 시 즉시 반환
3. 실패(Error) 시 다음 provider로
4. 전체 실패 시 마지막 에러를 throw

```typescript
export async function callLLM(
  req: LLMRequest,
  env: LLMEnv,
  config?: Partial<LLMConfig>
): Promise<LLMResponse>
```

### 2.6 env.ts 변경 (gate-x)

```typescript
// 기존 GateEnv에 추가
OPENAI_API_KEY?: string;
GOOGLE_AI_API_KEY?: string;
LLM_PROVIDER_ORDER?: string; // "anthropic,openai,google"
```

### 2.7 ogd-queue-worker.ts 변경

```typescript
// Before (stub)
const phaseResult = `Phase ${phase + 1} result for evaluation ${evaluationId}`;

// After (실제 LLM 호출)
const llmResp = await callLLM(
  { prompt: `Evaluate phase ${phase + 1} for evaluation ID: ${evaluationId}` },
  env
);
const phaseResult = llmResp.text;
```

## 3. F407 — Gate-X Web UI 상세 설계

### 3.1 패키지 구조 (packages/gate-x-web/)

```
packages/gate-x-web/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── wrangler.pages.toml       # Pages 배포 설정
├── public/
└── src/
    ├── main.tsx
    ├── App.tsx               # React Router 설정 (5 routes)
    ├── lib/
    │   └── api.ts            # gate-x API 클라이언트 (fetch 기반)
    ├── components/
    │   ├── Layout.tsx        # 공통 레이아웃 (사이드바 + 헤더)
    │   ├── StatusBadge.tsx   # evaluation 상태 배지
    │   └── PipelineCard.tsx  # 파이프라인 카드
    └── routes/
        ├── dashboard.tsx     # / — 홈 대시보드
        ├── pipelines.tsx     # /pipelines — 목록
        ├── pipeline-detail.tsx # /pipelines/:id — 상세
        ├── reports.tsx       # /reports — 리포트
        └── settings.tsx      # /settings — 설정
```

### 3.2 API 클라이언트 (src/lib/api.ts)

gate-x Workers API 엔드포인트:
- `GET /api/ax-bd-evaluations` — 파이프라인 목록
- `GET /api/ax-bd-evaluations/:id` — 파이프라인 상세
- `GET /api/evaluation-report` — 리포트 목록
- `GET /api/api-keys` — API Key 목록
- `POST /api/api-keys` — API Key 생성

인증: `Authorization: Bearer {token}` (LocalStorage에 JWT 저장)

### 3.3 대시보드 화면 (routes/dashboard.tsx)

```
┌─────────────────────────────────┐
│  Gate-X Dashboard               │
│  ┌──────┬──────┬──────┬──────┐  │
│  │ 전체 │ Active│  Go  │ Kill │  │
│  │  12  │   5  │   3  │   2  │  │
│  └──────┴──────┴──────┴──────┘  │
│                                  │
│  최근 파이프라인                  │
│  ┌────────────────────────────┐  │
│  │ ✅ Healthcare AI Eval      │  │
│  │ 🔄 GIVC 시드 검증          │  │
│  │ 📋 신규 평가 1             │  │
│  └────────────────────────────┘  │
└─────────────────────────────────┘
```

### 3.4 파이프라인 상세 화면 (routes/pipeline-detail.tsx)

O-G-D 단계 진행 표시:
```
Phase 1 [완료] → Phase 2 [완료] → Phase 3 [진행중...]
                                            ↑ LLM 호출 중
```

### 3.5 package.json (gate-x-web)

```json
{
  "name": "@foundry-x/gate-x-web",
  "version": "0.1.0",
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.9.3",
    "vitest": "^3.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^25.0.0"
  }
}
```

### 3.6 wrangler.pages.toml

```toml
name = "gate-x-web"
pages_build_output_dir = "dist"
compatibility_date = "2024-09-23"

[vars]
VITE_GATE_X_API_URL = "https://gate-x-api.ktds-axbd.workers.dev"
```

## 4. 테스트 설계

### F408 테스트 (packages/gate-x/src/test/)

| 파일 | 테스트 항목 | 수 |
|------|------------|-----|
| llm-providers.test.ts | anthropic/openai/google provider mock 호출 성공 | 3 |
| llm-registry.test.ts | 폴백 체인: 첫 provider 성공 → 첫 번째 반환 | 1 |
| llm-registry.test.ts | 폴백 체인: 첫 실패 → 두 번째 성공 | 1 |
| llm-registry.test.ts | 폴백 체인: 전체 실패 → throw | 1 |

### F407 테스트 (packages/gate-x-web/src/test/)

| 파일 | 테스트 항목 | 수 |
|------|------------|-----|
| dashboard.test.tsx | 대시보드 렌더링 (제목 표시) | 1 |
| pipelines.test.tsx | 파이프라인 목록 렌더링 | 1 |
| pipeline-detail.test.tsx | 상세 페이지 렌더링 (O-G-D 단계) | 1 |
| api-client.test.ts | API 클라이언트 fetch mock | 2 |

## 5. Worker 파일 매핑

| Worker | 담당 범위 | 파일 목록 |
|--------|-----------|---------|
| Worker A (F408) | LLM 추상화 레이어 + gate-x 연동 | `packages/gate-x/src/services/llm/types.ts`, `providers/anthropic.ts`, `providers/openai.ts`, `providers/google.ts`, `registry.ts`, `index.ts`, `env.ts`, `workers/ogd-queue-worker.ts`, `wrangler.toml` (secrets 추가), `src/test/llm-providers.test.ts`, `src/test/llm-registry.test.ts` |
| Worker B (F407) | Gate-X Web UI 패키지 전체 | `packages/gate-x-web/` 신규 패키지 전체, `pnpm-workspace.yaml` 갱신 |

## 6. 완료 기준 체크리스트

### F408 — LLM 추상화 레이어
- [ ] `LLMProvider` 인터페이스 + 3개 provider 구현 완료
- [ ] 폴백 체인 registry 구현 (3단계: anthropic → openai → google)
- [ ] `ogd-queue-worker.ts` stub → `callLLM()` 교체
- [ ] `GateEnv`에 `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY` 추가
- [ ] 테스트 6개 통과 (provider 3 + registry 3)
- [ ] typecheck 통과

### F407 — Gate-X Web UI
- [ ] `packages/gate-x-web/` 패키지 생성 완료
- [ ] 5개 라우트 구현 (dashboard, pipelines, pipeline-detail, reports, settings)
- [ ] gate-x API 클라이언트 구현
- [ ] 테스트 5개 통과
- [ ] typecheck 통과
- [ ] `pnpm-workspace.yaml`에 gate-x-web 추가
