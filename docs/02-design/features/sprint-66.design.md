---
code: FX-DSGN-066
title: "Sprint 66 Design — F205 Homepage 재구성 + F208 Discovery-X API 스펙"
version: 1.0
status: Active
category: DSGN
created: 2026-03-26
updated: 2026-03-26
author: Sinclair Seo (AI-assisted)
sprint: 66
features: [F205, F208]
req: [FX-REQ-197, FX-REQ-200]
plan: "[[FX-PLAN-066]]"
---

## Executive Summary

| 관점 | 결과 |
|------|------|
| **Match Rate 목표** | 90% (F205: 90%, F208: 90%) |
| **신규 파일** | 5 (contract.md 1, shared 1, schema 1, route 1, service 1) |
| **수정 파일** | 5 (page.tsx, navbar.tsx, footer.tsx, README.md, app.ts) |
| **D1 테이블** | 0 (이번 Sprint 마이그레이션 없음) |

---

## 1. 아키텍처 개요

```
[F205: Homepage 재구성]                    [F208: Discovery-X API 스펙]
  page.tsx  navbar  footer  README          contract.md  OpenAPI
       │                                         │
       ▼                                         ▼
  데이터 갱신 (하드코딩)                     packages/shared/discovery-x.ts
  Phase 5d 수치 + BDP 7단계                 packages/api/schemas/discovery-x.schema.ts
  Roadmap Phase 5a~5e 세분화                packages/api/routes/ax-bd-discovery.ts (stub)
                                            packages/api/services/discovery-x-ingest-service.ts (stub)
```

---

## 2. F205 — Homepage 재구성 상세 설계

### 2.1 SITE_META 갱신

```typescript
// packages/web/src/app/(landing)/page.tsx

const SITE_META = {
  sprint: "Sprint 64",
  phase: "Phase 5d",
  phaseTitle: "AX BD Ideation MVP",
  tagline: "AX 사업개발 AI 오케스트레이션 플랫폼",
} as const;
```

### 2.2 Stats Bar 갱신

```typescript
const stats = [
  { value: "192", label: "API Endpoints" },
  { value: "116", label: "Services" },
  { value: "1,481+", label: "Tests" },
  { value: "50", label: "D1 Migrations" },
  { value: "64", label: "Sprints" },
];
```

### 2.3 BDP 7단계 Process Flow (신규)

기존 4단계(수집→계획→실행→데모)를 BDP 7단계로 교체:

```typescript
const processSteps = [
  { step: "01", title: "수집", desc: "시장/트렌드/경쟁사 데이터 자동 수집 (Discovery-X 연동)", icon: Scan },
  { step: "02", title: "발굴", desc: "아이디어 등록 + Type A/B/C 분류 + Pain Point 발견", icon: Lightbulb },
  { step: "03", title: "형상화", desc: "BMC 에디터 + AI 초안 (BMCAgent) + PRD 자동 작성", icon: PenTool },
  { step: "04", title: "검증", desc: "다중 AI 검토 + Six Hats 토론 + 팀 승인", icon: CheckCircle2 },
  { step: "05", title: "제품화", desc: "PoC/MVP 자동 구축 — AI 에이전트가 코드·테스트·배포 처리", icon: Rocket },
  { step: "06", title: "GTM", desc: "제안서·발표자료·데모 환경 자동 생성", icon: Megaphone },
  { step: "07", title: "평가", desc: "KPI 추적 + 포트폴리오 대시보드 + Go/Kill 판단", icon: BarChart3 },
];
```

### 2.4 Pillars 갱신

```typescript
const pillars = [
  {
    icon: Brain,
    title: "BDP 라이프사이클",
    label: "7단계 자동화",
    desc: "수집→발굴→형상화→검증→제품화→GTM→평가. 사업개발 전체를 한 곳에서.",
    detail: "AX BD 프로세스 v0.8 기반, Foundry-X가 모든 단계를 오케스트레이션",
    color: "axis-primary",
  },
  {
    icon: Target,
    title: "AI 에이전트 하네스",
    label: "BMCAgent + InsightAgent",
    desc: "BMC 초안 자동 작성, 인사이트 도출, 다중 AI 검토까지. 에이전트가 사업기회를 형상화해요.",
    detail: "Anthropic + OpenAI + Gemini + DeepSeek 멀티모델 파이프라인",
    color: "axis-blue",
  },
  {
    icon: Shield,
    title: "SDD Triangle",
    label: "Spec ↔ Code ↔ Test",
    desc: "명세, 코드, 테스트가 항상 동기화돼요. Git이 진실, Foundry-X는 렌즈.",
    detail: "192 endpoints, 1,481+ tests, 50 D1 migrations — 자동 정합성 검증",
    color: "axis-green",
  },
];
```

### 2.5 Agent Grid 갱신

기존 6종(Phase 4) + Phase 5d 에이전트 추가:

```typescript
const agents = [
  { name: "BMCAgent", role: "BMC 초안 · AI 자동 생성", desc: "9블록 BMC를 아이디어 기반으로 자동 작성. 업계 트렌드와 경쟁사 데이터를 반영해요.", icon: PenTool },
  { name: "InsightAgent", role: "인사이트 · 기회 발굴", desc: "수집 데이터에서 패턴을 발견하고, 사업기회 인사이트를 자동 도출해요.", icon: Lightbulb },
  { name: "ReviewAgent", role: "다중 AI 검토 · Six Hats", desc: "ChatGPT, Gemini, DeepSeek로 BMC/PRD를 교차 검토. Six Hats 토론으로 다각도 분석.", icon: Eye },
  { name: "ArchitectAgent", role: "아키텍처 분석 · 설계 리뷰", desc: "코드베이스 구조를 분석하고, 의존성 관계를 파악하며, 설계 품질을 평가해요.", icon: Layers },
  { name: "TestAgent", role: "테스트 생성 · 커버리지 분석", desc: "테스트 케이스를 자동 생성하고, 커버리지 갭과 엣지 케이스를 탐지해요.", icon: TestTube },
  { name: "SecurityAgent", role: "OWASP 스캔 · PR 보안 분석", desc: "보안 취약점을 사전에 탐지하고, PR diff를 분석해 위험 요소를 리포트해요.", icon: ShieldCheck },
];
```

### 2.6 Architecture Blueprint 갱신

```typescript
const architecture = [
  { layer: "CLI Layer", items: ["foundry-x init", "foundry-x sync", "foundry-x status"], tech: "TypeScript + Commander + Ink TUI" },
  { layer: "API Layer", items: ["192 Endpoints", "116 Services", "36 Route Modules"], tech: "Hono on Cloudflare Workers" },
  { layer: "Agent Layer", items: ["BMCAgent", "InsightAgent", "ReviewAgent", "ArchitectAgent + 3종"], tech: "Orchestrator + MCP + Multi-Model" },
  { layer: "Data Layer", items: ["D1 SQLite (50 Migrations)", "KV Cache", "Git (SSOT)"], tech: "Cloudflare D1 + simple-git" },
];
```

### 2.7 Roadmap Timeline 갱신

Phase 5를 세분화:

```typescript
const roadmap = [
  { phase: "Phase 1~4", title: "CLI + API + Web + 멀티테넌시", version: "v0.1 → v2.1", status: "done",
    items: ["CLI 3커맨드 + Ink TUI", "192 API Endpoints", "Next.js Dashboard", "SSO + RBAC"] },
  { phase: "Phase 5a", title: "Agent Evolution", version: "Sprint 32~47", status: "done",
    items: ["6종 에이전트", "모델 라우팅", "PRD v8 확정"] },
  { phase: "Phase 5b", title: "BDP 자동화", version: "Sprint 48~58", status: "done",
    items: ["Discovery 9기준", "다중 AI 검토", "Six Hats 토론", "수집 채널 통합"] },
  { phase: "Phase 5c", title: "방법론 플러그인", version: "Sprint 59~60", status: "done",
    items: ["레지스트리 + 인터페이스", "BDP 모듈화", "pm-skills 모듈"] },
  { phase: "Phase 5d", title: "Ideation MVP", version: "Sprint 61~67", status: "current",
    items: ["BMC CRUD + AI", "아이디어-BMC 연결", "인사이트 + 평가", "Discovery-X 연동"] },
];
```

### 2.8 Ecosystem 역할 재정의

```typescript
const ecosystem = [
  { name: "Discovery-X", role: "수집 엔진", desc: "시장/트렌드/경쟁사 데이터 수집 → API로 Foundry-X에 공급", arrow: "API 연동", color: "axis-green" },
  { name: "Foundry-X", role: "베이스캠프", desc: "발굴→형상화→검증→제품화→GTM→평가 전 단계 오케스트레이션", arrow: "중심", color: "axis-primary" },
  { name: "AXIS DS", role: "UI 일관성", desc: "디자인 토큰 + React 컴포넌트 시스템", arrow: "컴포넌트 공급", color: "axis-blue" },
];
```

### 2.9 Navbar 갱신

```typescript
const navLinks = [
  { href: "#process", label: "BDP 프로세스" },
  { href: "#features", label: "핵심 기능" },
  { href: "#agents", label: "AI 에이전트" },
  { href: "#architecture", label: "아키텍처" },
  { href: "#roadmap", label: "로드맵" },
];
```

### 2.10 Footer 갱신

- Sprint 번호: `Sprint 64 · Phase 5d` (동적 X, 배포 시점 확정)
- Ecosystem 링크 유지

### 2.11 README.md 재작성

```markdown
# Foundry-X

> AX 사업개발 AI 오케스트레이션 플랫폼

## 무엇을 하나요?

AX BD팀의 사업개발 전체 라이프사이클을 AI 에이전트로 자동화해요.
수집→발굴→형상화→검증→제품화→GTM→평가 7단계를 한 곳에서.

## 왜 만들었나요?

사업기회 발굴부터 PoC/MVP 구축까지 2~4주 걸리던 과정을 3일 이내로 단축.
"Git이 진실, Foundry-X는 렌즈" — 모든 명세/코드/테스트/결정 이력이 Git에 존재하고,
Foundry-X가 이를 읽고 분석하고 동기화를 강제해요.

## 현재 상태

| 항목 | 수치 |
|------|------|
| Phase | 5d — AX BD Ideation MVP |
| Sprints | 64 완료 |
| API Endpoints | 192 |
| Services | 116 |
| Tests | 1,481+ (API) + 125 (CLI) + 121 (Web) |
| D1 Migrations | 50 |

## 기술 스택

| 영역 | 기술 |
|------|------|
| CLI | TypeScript, Commander, Ink TUI |
| API | Hono on Cloudflare Workers |
| Web | Next.js 14, React 18, Zustand |
| DB | Cloudflare D1 (SQLite) |
| AI | Anthropic + OpenAI + Gemini + DeepSeek |

## 시작하기

\`\`\`bash
pnpm install
turbo build
turbo test
\`\`\`

## 링크

- [Dashboard](https://fx.minu.best/dashboard)
- [API Docs](https://foundry-x-api.ktds-axbd.workers.dev)
- [npm](https://www.npmjs.com/package/foundry-x)
```

---

## 3. F208 — Discovery-X API 인터페이스 계약 상세 설계

### 3.1 계약 문서 구조

`docs/specs/ax-bd-atoz/discovery-x-api-contract.md`:

```
1. 개요 (목적, 참여 시스템)
2. 인증 (Bearer token, API key 발급/갱신)
3. Payload 스키마 (MarketTrend, CompetitorData, PainPoint, CollectionSource)
4. 엔드포인트 (Webhook ingest, Status, Sync)
5. Rate Limit (60 req/min, 429 응답 포맷)
6. 에러 코드 (400/401/429/503)
7. Fallback/재시도 (DLQ 패턴, 지수 백오프)
8. 버전 관리 (v1 prefix, 하위호환 정책)
```

### 3.2 TypeScript 타입 정의

```typescript
// packages/shared/src/discovery-x.ts

/** Discovery-X에서 전송하는 수집 데이터 페이로드 */
export interface DiscoveryIngestPayload {
  version: "v1";
  source: CollectionSource;
  timestamp: number;
  data: DiscoveryDataItem[];
}

export interface CollectionSource {
  id: string;
  type: "market_trend" | "competitor" | "pain_point" | "technology" | "regulation";
  name: string;
  url?: string;
}

export interface DiscoveryDataItem {
  id: string;
  sourceId: string;
  type: CollectionSource["type"];
  title: string;
  summary: string;
  content?: string;
  tags: string[];
  confidence: number;  // 0.0 ~ 1.0
  collectedAt: number;
  metadata?: Record<string, unknown>;
}

/** Discovery-X 연동 상태 */
export interface DiscoveryStatus {
  connected: boolean;
  lastSyncAt: number | null;
  pendingItems: number;
  failedItems: number;
  version: string;
}

/** Discovery-X 연동 설정 */
export interface DiscoveryConfig {
  apiKey: string;
  webhookUrl: string;
  rateLimitPerMinute: number;
  retryMaxAttempts: number;
  retryBackoffMs: number;
}
```

### 3.3 Zod 스키마

```typescript
// packages/api/src/schemas/discovery-x.schema.ts

import { z } from "zod";

const collectionSourceTypeEnum = z.enum([
  "market_trend", "competitor", "pain_point", "technology", "regulation"
]);

export const collectionSourceSchema = z.object({
  id: z.string().min(1),
  type: collectionSourceTypeEnum,
  name: z.string().min(1).max(200),
  url: z.string().url().optional(),
});

export const discoveryDataItemSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  type: collectionSourceTypeEnum,
  title: z.string().min(1).max(500),
  summary: z.string().min(1).max(2000),
  content: z.string().max(50000).optional(),
  tags: z.array(z.string().max(50)).max(20),
  confidence: z.number().min(0).max(1),
  collectedAt: z.number().int().positive(),
  metadata: z.record(z.unknown()).optional(),
});

export const discoveryIngestPayloadSchema = z.object({
  version: z.literal("v1"),
  source: collectionSourceSchema,
  timestamp: z.number().int().positive(),
  data: z.array(discoveryDataItemSchema).min(1).max(100),
});

export const discoverySyncSchema = z.object({
  since: z.number().int().positive().optional(),
  types: z.array(collectionSourceTypeEnum).optional(),
});
```

### 3.4 Stub Route

```typescript
// packages/api/src/routes/ax-bd-discovery.ts

import { Hono } from "hono";

const app = new Hono();

// POST /api/ax-bd/discovery/ingest — Discovery-X webhook 수신
app.post("/ingest", async (c) => {
  // 1. Bearer token 검증 (Authorization header)
  // 2. Payload 스키마 검증 (discoveryIngestPayloadSchema)
  // 3. DiscoveryXIngestService.ingest() 호출 (stub: 성공 응답)
  return c.json({ ok: true, received: 0, message: "Discovery-X ingest endpoint (stub)" });
});

// GET /api/ax-bd/discovery/status — 연동 상태
app.get("/status", async (c) => {
  return c.json({
    connected: false,
    lastSyncAt: null,
    pendingItems: 0,
    failedItems: 0,
    version: "v1",
  });
});

// POST /api/ax-bd/discovery/sync — 수동 재동기화
app.post("/sync", async (c) => {
  return c.json({ ok: true, message: "Sync triggered (stub)" });
});

export default app;
```

### 3.5 Stub Service

```typescript
// packages/api/src/services/discovery-x-ingest-service.ts

export class DiscoveryXIngestService {
  constructor(private db: D1Database) {}

  /** Discovery-X 데이터 수신 (stub — 향후 구현) */
  async ingest(payload: DiscoveryIngestPayload, tenantId: string): Promise<{ received: number }> {
    // TODO: Phase 5e에서 실제 저장 구현
    // 1. 중복 체크 (payload.data[].id 기준)
    // 2. D1 ax_discovery_items INSERT
    // 3. 실패 건 DLQ 저장
    return { received: payload.data.length };
  }

  /** 연동 상태 조회 */
  async getStatus(tenantId: string): Promise<DiscoveryStatus> {
    return {
      connected: false,
      lastSyncAt: null,
      pendingItems: 0,
      failedItems: 0,
      version: "v1",
    };
  }

  /** 수동 재동기화 트리거 */
  async triggerSync(tenantId: string, options?: { since?: number; types?: string[] }): Promise<void> {
    // TODO: Discovery-X API 호출하여 데이터 pulling
  }
}
```

### 3.6 app.ts 라우트 등록

```typescript
// packages/api/src/app.ts (추가)
import axBdDiscovery from "./routes/ax-bd-discovery";

app.route("/api/ax-bd/discovery", axBdDiscovery);
```

---

## 4. 공유 타입 확장 없음

F208의 타입은 별도 `packages/shared/src/discovery-x.ts`에 신규 파일로 생성 (기존 ax-bd.ts 변경 없음).

---

## 5. Worker 파일 매핑 (충돌 방지)

### W1: F205 Homepage 재구성
**수정 허용 파일:**
- `packages/web/src/app/(landing)/page.tsx` (MODIFY)
- `packages/web/src/components/landing/navbar.tsx` (MODIFY)
- `packages/web/src/components/landing/footer.tsx` (MODIFY)
- `README.md` (MODIFY)

### W2: F208 Discovery-X API 스펙
**수정/생성 허용 파일:**
- `docs/specs/ax-bd-atoz/discovery-x-api-contract.md` (NEW)
- `packages/shared/src/discovery-x.ts` (NEW)
- `packages/api/src/schemas/discovery-x.schema.ts` (NEW)
- `packages/api/src/routes/ax-bd-discovery.ts` (NEW)
- `packages/api/src/services/discovery-x-ingest-service.ts` (NEW)
- `packages/api/src/__tests__/ax-bd-discovery.test.ts` (NEW)

### 리더 처리 (merge 후):
- `packages/api/src/app.ts` — Discovery 라우트 등록 1줄 추가

---

## 6. 테스트 설계

### F205 테스트 (0건 신규)
- 기존 Web 테스트 패스 확인 (데이터만 변경)
- typecheck 통과 확인

### F208 테스트 (~15건)
| # | 테스트 | 유형 |
|---|--------|------|
| 1 | POST /ingest — 유효한 payload → 200 | Happy |
| 2 | POST /ingest — 빈 data 배열 → 400 | Validation |
| 3 | POST /ingest — 잘못된 version → 400 | Validation |
| 4 | POST /ingest — confidence 범위 초과 → 400 | Validation |
| 5 | POST /ingest — 인증 없음 → 401 | Auth |
| 6 | POST /ingest — 잘못된 토큰 → 401 | Auth |
| 7 | GET /status → 200 + 기본 상태 | Happy |
| 8 | POST /sync → 200 | Happy |
| 9 | POST /sync — 인증 없음 → 401 | Auth |
| 10 | Zod: 유효한 DiscoveryIngestPayload 파싱 | Schema |
| 11 | Zod: type enum 유효성 검증 | Schema |
| 12 | Zod: tags 최대 20개 제한 | Schema |
| 13 | Zod: data 최대 100건 제한 | Schema |
| 14 | Zod: confidence 범위 0~1 | Schema |
| 15 | Zod: content 최대 50000자 | Schema |
