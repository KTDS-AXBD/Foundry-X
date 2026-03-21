---
code: FX-DSGN-030
title: "Sprint 30 — 프로덕션 배포 동기화 + Phase 4 Go 판정 준비 + 품질 강화"
version: 0.1
status: Draft
category: DSGN
system-version: 2.2.0
created: 2026-03-21
updated: 2026-03-21
author: Sinclair Seo
---

# Sprint 30 Design Document

> **Summary**: F123(배포 동기화) + F124(프론트엔드 통합 개선) + F125(Phase 4 Go 판정) + F126(Harness Rules 자동 감지) + F127(PRD 정합성) + F128(E2E+에러 표준화) 상세 설계. Worker별 파일 할당 + API 스펙 + 테스트 계획 포함. D1 migration 없음 (kpi_events 재활용).
>
> **Project**: Foundry-X
> **Version**: v2.4
> **Author**: Sinclair Seo
> **Date**: 2026-03-21
> **Status**: Draft
> **Planning Doc**: [sprint-30.plan.md](../../01-plan/features/sprint-30.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. **프로덕션 동기화**: D1 0018 remote + Workers v2.2.0 배포로 Sprint 27~28 기능 실가동
2. **프론트엔드 통합 완성도**: ServiceContainer postMessage 프로토콜 확장 + 로딩/에러 UX
3. **Go 판정 기반**: KPI 대시보드에 Phase 4 전용 섹션 + 판정 문서
4. **코드 품질 자동화**: Harness Rules 감지 서비스 + API 에러 표준화
5. **기존 아키텍처 준수**: Hono service DI + Zod + OpenAPI + ESLint flat config 유지

### 1.2 Design Principles

- **기존 코드 확장 우선**: ServiceContainer.tsx 리팩토링, kpi.ts 라우트 확장, common.ts ErrorSchema 확장
- **D1 스키마 변경 없음**: kpi_events 테이블에 `harness_violation` event_type 추가 (CHECK 제약 확장은 ALTER TABLE 불필요, TEXT 타입)
- **최소 신규 파일**: 기존 서비스/라우트를 확장하고, 신규 파일은 harness-rules.ts, error.ts, E2E spec만
- **점진적 마이그레이션**: ErrorResponse 스키마는 핵심 라우트 먼저, 나머지는 후속

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     Cloudflare Workers (API)                       │
│                                                                    │
│  ┌───────────────────────┐   ┌──────────────────────────────────┐ │
│  │ HarnessRulesService   │   │ KpiLogger (기존 + 확장)          │ │
│  │  (신규 F126)          │   │  + getPhase4Kpi()               │ │
│  │  checkRules()         │   │  + logHarnessViolation()        │ │
│  │  detectViolations()   │   └──────────────────────────────────┘ │
│  │  emitViolationAlert() │                                        │
│  └────────┬──────────────┘   ┌──────────────────────────────────┐ │
│           │                   │ ErrorMiddleware (신규 F128)       │ │
│           ▼                   │  onError() — 표준 에러 포맷 강제  │ │
│  ┌──────────────────┐        └──────────────────────────────────┘ │
│  │ SSEManager (기존) │                                            │
│  │  pushEvent()      │   routes/kpi.ts   (기존 4ep + 1ep 확장)    │
│  └──────────────────┘   routes/harness.ts (신규 2ep)              │
│                                                                    │
│  schemas/error.ts (신규) — StructuredErrorSchema + error codes     │
│  schemas/common.ts (수정) — ErrorSchema → StructuredErrorSchema    │
│                                                                    │
│  D1: kpi_events (기존 0018), 스키마 변경 없음                      │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     Next.js (Web)                                  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ ServiceContainer.tsx (수정 F124)                            │   │
│  │   + FoundryMessage 프로토콜 6종                             │   │
│  │   + 로딩 스켈레톤 + 에러 바운더리                            │   │
│  │   + 사이드바 URL 동기화                                     │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ analytics/page.tsx (수정 F125)                              │   │
│  │   + Phase4KpiSection 컴포넌트                               │   │
│  │   + K7/K8/K9 카드 + 트렌드 차트                             │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  e2e/integration-path.spec.ts (신규 F128)                         │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

#### F124: postMessage 프로토콜 확장

```
Foundry-X (parent)                    서브앱 (iframe)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
iframe.onload →
  postMessage({ type: "FX_SSO_TOKEN", token, serviceId })  →
  postMessage({ type: "FX_CONTEXT_SYNC", projectId, orgId }) →
  postMessage({ type: "FX_THEME_SYNC", theme })             →
                                            ← postMessage({ type: "FX_READY" })
                                            ← postMessage({ type: "FX_NAVIGATE", path })
  사이드바 URL 갱신 ←
                                            ← postMessage({ type: "FX_ERROR", message })
  에러 바운더리 표시 ←
```

#### F125: Phase 4 KPI 데이터 흐름

```
kpi_events 테이블
  → KpiLogger.getPhase4Kpi(tenantId, days)
    → K7 WAU: SELECT COUNT(DISTINCT user_id) WHERE event_type='page_view' 주간 그룹
    → K8 완료율: SELECT status, COUNT(*) FROM agent_tasks GROUP BY status
    → K9 전환율: kpi_events 'service_switch' vs 'integrated_workflow' 비율
  → GET /api/kpi/phase4
  → analytics/page.tsx Phase4KpiSection
    → 3 카드 (WAU, 완료율, 전환율) + 주간 트렌드 차트
```

#### F126: Harness Rules 감지 흐름

```
GET /api/harness/rules/:projectId
  → HarnessRulesService.checkRules(projectId)
    → verify.ts 로직 재활용 (6단계 파이프라인)
    → 위반 목록 + 심각도 반환
    → kpi_events에 'harness_violation' 이벤트 기록
    → SSE pushEvent("harness.violation.detected", violations)

GET /api/harness/violations/:projectId
  → kpi_events에서 harness_violation 이력 조회
```

#### F128: 에러 응답 흐름 (표준화 후)

```
현재: c.json({ error: "message" }, status)
변경: c.json({ error: { code: "AUTH_001", message: "...", details: {} } }, status)

globalOnError handler:
  → 에러 타입 판별 (ZodError, ApiError, HTTPException, unknown)
  → StructuredErrorResponse 형식으로 변환
  → 로깅 (KpiLogger에 에러 이벤트 기록)
```

---

## 3. Detailed Design

### 3.1 F123 — 프로덕션 배포 동기화 (P0)

순수 운영 작업, 코드 변경 없음.

#### 3.1.1 D1 Migration 0018 Remote

```bash
cd packages/api
wrangler d1 migrations apply foundry-x-db --remote
# 기대: 0018_kpi_and_reconciliation.sql 적용
# 검증: SELECT name FROM sqlite_master WHERE type='table' → kpi_events, reconciliation_runs 확인
```

#### 3.1.2 Workers v2.2.0 배포

```bash
cd packages/api
wrangler deploy
# 검증: curl https://foundry-x-api.ktds-axbd.workers.dev/api/health → 200
# 검증: curl .../api/analytics/summary → KPI 데이터 (빈 값이지만 200)
```

#### 3.1.3 Smoke Test 체크리스트

- [ ] `/api/health` 200
- [ ] `/api/analytics/summary` 200 (KPI)
- [ ] `/api/reconciliation/status` 200 (Cron)
- [ ] Cron Trigger 로그 확인 (`wrangler tail`)
- [ ] Pages `fx.minu.best` 200

### 3.2 F124 — 프론트엔드 통합 개선 (P1)

#### 3.2.1 수정 파일: `packages/web/src/components/feature/ServiceContainer.tsx`

**현재 코드** (50줄, postMessage 단일 타입):
```typescript
// 현재: "FX_SSO_TOKEN" 만 전송
iframe.contentWindow?.postMessage(
  { type: "FX_SSO_TOKEN", token: hubToken, serviceId },
  serviceUrl
);
```

**확장 설계:**

```typescript
// --- 타입 정의 (파일 상단 또는 shared/sso.ts에 추가) ---

type FoundryToSubAppMessage =
  | { type: "FX_SSO_TOKEN"; token: string; serviceId: string }
  | { type: "FX_CONTEXT_SYNC"; projectId: string; orgId: string }
  | { type: "FX_THEME_SYNC"; theme: "light" | "dark" };

type SubAppToFoundryMessage =
  | { type: "FX_READY" }
  | { type: "FX_NAVIGATE"; path: string }
  | { type: "FX_ERROR"; message: string };

type FoundryMessage = FoundryToSubAppMessage | SubAppToFoundryMessage;

// --- Props 확장 ---
interface ServiceContainerProps {
  serviceUrl: string;
  serviceId: string;
  title: string;
  projectId?: string;  // 현재 프로젝트 컨텍스트
  orgId?: string;
}

// --- 상태 관리 ---
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

// --- postMessage 수신 핸들러 ---
useEffect(() => {
  const handler = (event: MessageEvent<SubAppToFoundryMessage>) => {
    if (event.origin !== serviceUrl) return;

    switch (event.data.type) {
      case "FX_READY":
        setLoading(false);
        break;
      case "FX_NAVIGATE":
        // 사이드바 URL 동기화 (router.push 또는 상태 갱신)
        break;
      case "FX_ERROR":
        setError(event.data.message);
        break;
    }
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}, [serviceUrl]);

// --- iframe onLoad 확장 ---
const handleIframeLoad = () => {
  const iframe = iframeRef.current;
  if (!iframe?.contentWindow) return;

  // 1. SSO 토큰 (기존)
  sendMessage({ type: "FX_SSO_TOKEN", token: hubToken, serviceId });
  // 2. 프로젝트 컨텍스트 (신규)
  if (projectId && orgId) {
    sendMessage({ type: "FX_CONTEXT_SYNC", projectId, orgId });
  }
  // 3. 테마 (신규)
  sendMessage({ type: "FX_THEME_SYNC", theme: resolvedTheme ?? "dark" });
};

const sendMessage = (msg: FoundryToSubAppMessage) => {
  iframeRef.current?.contentWindow?.postMessage(msg, serviceUrl);
};

// --- 로딩 스켈레톤 + 에러 바운더리 JSX ---
return (
  <div className="relative w-full h-full">
    {loading && <ServiceLoadingSkeleton title={title} />}
    {error && <ServiceErrorBoundary message={error} onRetry={() => { setError(null); setLoading(true); }} />}
    <iframe
      ref={iframeRef}
      src={serviceUrl}
      onLoad={handleIframeLoad}
      className={cn("w-full h-full border-0", loading && "invisible")}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      title={title}
    />
  </div>
);
```

#### 3.2.2 신규 컴포넌트

**`packages/web/src/components/feature/ServiceLoadingSkeleton.tsx`** (~30줄)
- AXIS DS 스켈레톤 패턴: 사이드바 + 헤더 + 콘텐츠 영역 펄스 애니메이션

**`packages/web/src/components/feature/ServiceErrorBoundary.tsx`** (~25줄)
- 에러 메시지 + "다시 시도" 버튼 + "독립 접근" 링크 (serviceUrl 직접 열기)

#### 3.2.3 shared 타입 확장

**수정 파일**: `packages/shared/src/sso.ts`

```typescript
// 기존 HubTokenPayload 유지, 메시지 타입만 추가
export type FoundryToSubAppMessage =
  | { type: "FX_SSO_TOKEN"; token: string; serviceId: string }
  | { type: "FX_CONTEXT_SYNC"; projectId: string; orgId: string }
  | { type: "FX_THEME_SYNC"; theme: "light" | "dark" };

export type SubAppToFoundryMessage =
  | { type: "FX_READY" }
  | { type: "FX_NAVIGATE"; path: string }
  | { type: "FX_ERROR"; message: string };
```

### 3.3 F125 — Phase 4 Go 판정 준비 (P1)

#### 3.3.1 API 확장: `packages/api/src/services/kpi-logger.ts`

기존 KpiLogger에 Phase 4 전용 메서드 추가:

```typescript
// 기존 getSummary() 기반 확장
async getPhase4Kpi(tenantId: string, days = 28): Promise<Phase4Kpi> {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // K7 WAU: 주간 unique user count
  const wauResult = await this.db.prepare(`
    SELECT strftime('%Y-W%W', created_at) as week, COUNT(DISTINCT user_id) as wau
    FROM kpi_events
    WHERE tenant_id = ? AND event_type = 'page_view' AND created_at >= ?
    GROUP BY week ORDER BY week
  `).bind(tenantId, since).all();

  // K8 에이전트 완료율
  const agentResult = await this.db.prepare(`
    SELECT status, COUNT(*) as cnt FROM agent_tasks
    WHERE tenant_id = ? AND created_at >= ?
    GROUP BY status
  `).bind(tenantId, since).all();

  // K9 서비스 전환율 (integrated vs switch)
  const switchResult = await this.db.prepare(`
    SELECT event_type, COUNT(*) as cnt FROM kpi_events
    WHERE tenant_id = ? AND event_type IN ('service_switch', 'integrated_workflow')
    AND created_at >= ?
    GROUP BY event_type
  `).bind(tenantId, since).all();

  return { wauTrend, agentCompletionRate, serviceIntegrationRate, period };
}
```

**Phase4Kpi 타입:**

```typescript
interface Phase4Kpi {
  wauTrend: { week: string; wau: number }[];
  agentCompletionRate: number; // 0~100
  serviceIntegrationRate: number; // 0~100 (integrated / (integrated + switch))
  period: { from: string; to: string };
}
```

#### 3.3.2 라우트 확장: `packages/api/src/routes/kpi.ts`

기존 4 endpoints에 1개 추가:

```typescript
// GET /api/kpi/phase4?days=28
kpiRoute.openapi(
  createRoute({
    method: "get",
    path: "/kpi/phase4",
    request: { query: z.object({ days: z.coerce.number().default(28) }) },
    responses: {
      200: { content: { "application/json": { schema: phase4KpiSchema } } },
    },
  }),
  async (c) => {
    const { days } = c.req.valid("query");
    const tenantId = getTenantId(c);
    const result = await kpiLogger.getPhase4Kpi(tenantId, days);
    return c.json(result, 200);
  }
);
```

#### 3.3.3 UI: `packages/web/src/app/(app)/analytics/page.tsx`

기존 analytics 페이지에 `Phase4KpiSection` 컴포넌트 추가:

```typescript
// Phase4KpiSection — analytics/page.tsx 하단에 추가
function Phase4KpiSection() {
  const [kpi, setKpi] = useState<Phase4Kpi | null>(null);
  useEffect(() => { fetchPhase4Kpi().then(setKpi); }, []);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Phase 4 Go 판정 KPI</h2>
      <div className="grid grid-cols-3 gap-4">
        <KpiCard title="K7 WAU" value={latestWau} target="5명+" />
        <KpiCard title="K8 에이전트 완료율" value={`${rate}%`} target=">70%" />
        <KpiCard title="K9 통합 워크플로우" value={`${intRate}%`} target=">80%" />
      </div>
      <WauTrendChart data={kpi.wauTrend} />
    </section>
  );
}
```

#### 3.3.4 Go 판정 문서

**새 파일**: `docs/specs/phase-4-go-decision.md`

```markdown
---
code: FX-SPEC-GO4
title: Phase 4 Go/Pivot/Kill 판정
version: 0.1
status: Draft
created: 2026-03-21
---

# Phase 4 Go 판정

## 1. Go 조건 (PRD v5 §7.10)
| 조건 | 현재 상태 | 판정 |
|------|-----------|------|
| NPS 6+ (K12) | — (실사용자 미참여) | 측정 불가 |
| WAU 60%+ (K7) | {데이터} | {판정} |
| "돌아가고 싶지 않다" 피드백 2명+ | — | 미충족 |

## 2. 기술적 준비 상태
- Phase 4 Step 1~5 완료 현황 (F104/F106/F108/F109/F111)
- KPI 인프라 동작 확인
- 통합 경로 E2E 검증 결과

## 3. 판정
{Conditional Go — 기술 기반 완료, 실사용자 데이터 대기}
```

### 3.4 F126 — Harness Evolution Rules 자동 감지 (P2)

#### 3.4.1 신규 파일: `packages/api/src/services/harness-rules.ts`

```typescript
import type { D1Database } from "@cloudflare/workers-types";
import type { KpiLogger } from "./kpi-logger.js";
import type { SSEManager } from "./sse-manager.js";

interface HarnessViolation {
  rule: string;
  severity: "error" | "warning" | "info";
  file?: string;
  message: string;
}

interface HarnessCheckResult {
  score: number;       // 0-100
  passed: boolean;     // score >= 60
  violations: HarnessViolation[];
  checkedAt: string;
}

export class HarnessRulesService {
  constructor(
    private db: D1Database,
    private kpiLogger: KpiLogger,
    private sseManager: SSEManager
  ) {}

  async checkRules(tenantId: string, projectId: string): Promise<HarnessCheckResult> {
    const violations: HarnessViolation[] = [];
    let score = 100;

    // 규칙 1: placeholder-check (verify.ts 로직 재활용)
    // 규칙 2: consistency-check (CLAUDE.md ↔ AGENTS.md)
    // 규칙 3: freshness-check (마지막 갱신 7일 이상)
    // 규칙 4: schema-drift (SPEC F-item ↔ 실 코드)

    // 위반 이벤트 기록
    if (violations.length > 0) {
      await this.kpiLogger.logEvent(tenantId, "harness_violation", undefined, undefined, {
        projectId,
        violationCount: violations.length,
        violations: violations.map((v) => ({ rule: v.rule, severity: v.severity })),
      });

      // SSE 알림
      this.sseManager.pushEvent(tenantId, "harness.violation.detected", {
        projectId,
        violations,
        score,
      });
    }

    return { score, passed: score >= 60, violations, checkedAt: new Date().toISOString() };
  }

  async getViolationHistory(
    tenantId: string,
    projectId: string,
    limit = 20
  ): Promise<{ events: unknown[]; total: number }> {
    // kpi_events에서 harness_violation 타입 조회
    const result = await this.db.prepare(`
      SELECT * FROM kpi_events
      WHERE tenant_id = ? AND event_type = 'harness_violation'
      AND json_extract(metadata, '$.projectId') = ?
      ORDER BY created_at DESC LIMIT ?
    `).bind(tenantId, projectId, limit).all();

    return { events: result.results ?? [], total: result.results?.length ?? 0 };
  }
}
```

#### 3.4.2 신규 라우트: `packages/api/src/routes/harness.ts`

```typescript
// GET /api/harness/rules/:projectId — 규칙 검사 실행
harnessRoute.openapi(createRoute({
  method: "get",
  path: "/harness/rules/{projectId}",
  request: { params: z.object({ projectId: z.string() }) },
  responses: { 200: { content: { "application/json": { schema: harnessCheckResultSchema } } } },
}), async (c) => {
  const { projectId } = c.req.valid("param");
  const tenantId = getTenantId(c);
  const result = await harnessRulesService.checkRules(tenantId, projectId);
  return c.json(result, 200);
});

// GET /api/harness/violations/:projectId — 위반 이력
harnessRoute.openapi(createRoute({
  method: "get",
  path: "/harness/violations/{projectId}",
  request: { params: z.object({ projectId: z.string() }), query: z.object({ limit: z.coerce.number().default(20) }) },
  responses: { 200: { content: { "application/json": { schema: violationHistorySchema } } } },
}), async (c) => {
  const { projectId } = c.req.valid("param");
  const { limit } = c.req.valid("query");
  const tenantId = getTenantId(c);
  const result = await harnessRulesService.getViolationHistory(tenantId, projectId, limit);
  return c.json(result, 200);
});
```

#### 3.4.3 Zod 스키마: `packages/api/src/schemas/harness.ts` (신규)

```typescript
export const harnessViolationSchema = z.object({
  rule: z.string(),
  severity: z.enum(["error", "warning", "info"]),
  file: z.string().optional(),
  message: z.string(),
});

export const harnessCheckResultSchema = z.object({
  score: z.number(),
  passed: z.boolean(),
  violations: z.array(harnessViolationSchema),
  checkedAt: z.string(),
});

export const violationHistorySchema = z.object({
  events: z.array(z.unknown()),
  total: z.number(),
});
```

### 3.5 F127 — PRD↔구현 정합성 갱신 (P2)

문서 갱신 작업, 코드 변경 최소.

#### 3.5.1 PRD v5 MVP 체크리스트 갱신

**수정 파일**: `docs/specs/prd-v5.md` (§4 MVP 최소 기준)

```diff
-  - [ ] 기술 스택 점검 스프린트(Sprint 0) 완료 + 호환성 매트릭스 작성
+  - [x] 기술 스택 점검 스프린트(Sprint 0) 완료 + 호환성 매트릭스 작성 (F98, Sprint 25)
-  - [ ] KPI 측정 인프라 구축 (K7 WAU, K8 에이전트 완료율 최소 측정 가능)
+  - [x] KPI 측정 인프라 구축 (F100, Sprint 27 — kpi_events + /analytics)
-  - [ ] AXIS DS UI 전환 완료 (Foundry-X 웹 대시보드)
+  - [x] AXIS DS UI 전환 완료 (F104, Sprint 25 — 11 컴포넌트 전환)
-  - [ ] Plumb Track B 판정 완료
+  - [x] Plumb Track B 판정 완료 (F105, Sprint 28 — Stay Track A, ADR-001)
-  - [ ] 에이전트 자동 수정/rebase 구현 (G7, G8)
+  - [x] 에이전트 자동 수정/rebase 구현 (F101 Sprint 27 + F102 Sprint 28)
-  - [ ] Git↔D1 Reconciliation 동작 (G1)
+  - [x] Git↔D1 Reconciliation 동작 (F99, Sprint 27 — Cron 6h)
```

#### 3.5.2 codegen-core 판정

Go 판정 문서 §3에 포함. AI Foundry 리포 접근 후:
- 코드베이스 구조 확인 (AST 변환, 파일 생성 로직)
- Foundry-X MCP 경유 패턴과 호환성 분석
- 판정: 재활용 / 부분 참고 / 보류

### 3.6 F128 — E2E 테스트 보강 + 에러 핸들링 (P1)

#### 3.6.1 신규 스키마: `packages/api/src/schemas/error.ts`

```typescript
import { z } from "@hono/zod-openapi";

// 에러 코드 열거
export const ERROR_CODES = {
  // AUTH
  AUTH_001: "Token expired",
  AUTH_002: "Insufficient permissions",
  AUTH_003: "Invalid credentials",
  AUTH_004: "Email already registered",
  // VALIDATION
  VALIDATION_001: "Required field missing",
  VALIDATION_002: "Invalid format",
  // RESOURCE
  RESOURCE_001: "Not found",
  RESOURCE_002: "Already exists",
  // INTEGRATION
  INTEGRATION_001: "GitHub API failure",
  INTEGRATION_002: "Slack API failure",
  INTEGRATION_003: "LLM service unavailable",
  // INTERNAL
  INTERNAL_001: "Unexpected error",
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export const structuredErrorSchema = z.object({
  error: z.object({
    code: z.string().openapi({ example: "AUTH_001" }),
    message: z.string().openapi({ example: "Token expired" }),
    details: z.unknown().optional(),
  }),
}).openapi("StructuredErrorResponse");

// 헬퍼: 에러 응답 생성
export function errorResponse(c: Context, status: number, code: ErrorCode, details?: unknown) {
  return c.json({
    error: { code, message: ERROR_CODES[code], details },
  }, status as any);
}
```

#### 3.6.2 기존 라우트 마이그레이션 (핵심 3개 우선)

**auth.ts** — 6곳:
```typescript
// Before:
c.json({ error: "Email already registered" }, 409)
// After:
errorResponse(c, 409, "AUTH_004")
```

**agent.ts** — 4곳:
```typescript
// Before:
c.json({ error: "Agent not found" }, 404)
// After:
errorResponse(c, 404, "RESOURCE_001")
```

**spec.ts** — 3곳: 유사 패턴

나머지 라우트는 점진적 마이그레이션 (Sprint 30 이후).

#### 3.6.3 globalOnError 핸들러

**수정 파일**: `packages/api/src/index.ts` (app 생성부)

```typescript
app.onError((err, c) => {
  if (err instanceof z.ZodError) {
    return c.json({
      error: { code: "VALIDATION_001", message: err.issues.map(i => i.message).join(", "), details: err.issues },
    }, 400);
  }
  if (err instanceof HTTPException) {
    return c.json({
      error: { code: `HTTP_${err.status}`, message: err.message },
    }, err.status);
  }
  console.error("Unhandled error:", err);
  return c.json({
    error: { code: "INTERNAL_001", message: "Internal server error" },
  }, 500);
});
```

#### 3.6.4 E2E: `packages/web/e2e/integration-path.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Phase 4 통합 경로", () => {
  test("iframe SSO 토큰 전달", async ({ page }) => {
    // 1. 로그인
    // 2. 대시보드 → 서비스 탭
    // 3. iframe 로드 확인
    // 4. postMessage 이벤트 발생 확인 (console 로그 기반)
  });

  test("BFF 프록시 API 호출", async ({ page }) => {
    // 1. 대시보드에서 크로스 서비스 데이터 표시 확인
    // 2. network 탭에서 BFF 라우트 경유 확인
  });

  test("엔티티 레지스트리 크로스 쿼리", async ({ page }) => {
    // 1. 검색 입력
    // 2. entity_registry 결과 표시 확인
  });

  test("서브앱 로딩 실패 시 에러 바운더리", async ({ page }) => {
    // 1. 잘못된 서비스 URL로 접근
    // 2. 에러 메시지 + 재시도 버튼 확인
  });
});
```

---

## 4. File Change Summary

### 4.1 신규 파일

| 파일 | F# | 설명 | 예상 LOC |
|------|----|------|:--------:|
| `packages/api/src/services/harness-rules.ts` | F126 | Harness Rules 감지 서비스 | ~120 |
| `packages/api/src/routes/harness.ts` | F126 | Harness 라우트 2ep | ~80 |
| `packages/api/src/schemas/harness.ts` | F126 | Harness Zod 스키마 | ~30 |
| `packages/api/src/schemas/error.ts` | F128 | StructuredError + 에러 코드 + 헬퍼 | ~60 |
| `packages/web/src/components/feature/ServiceLoadingSkeleton.tsx` | F124 | 로딩 스켈레톤 | ~30 |
| `packages/web/src/components/feature/ServiceErrorBoundary.tsx` | F124 | 에러 바운더리 | ~25 |
| `packages/web/e2e/integration-path.spec.ts` | F128 | 통합 경로 E2E | ~80 |
| `docs/specs/phase-4-go-decision.md` | F125 | Go 판정 문서 | ~100 |

### 4.2 수정 파일

| 파일 | F# | 변경 내용 | 변경 범위 |
|------|----|-----------|:---------:|
| `packages/web/src/components/feature/ServiceContainer.tsx` | F124 | postMessage 6종 + 로딩/에러 | 대폭 (~50→120줄) |
| `packages/shared/src/sso.ts` | F124 | FoundryMessage 타입 추가 | 소폭 (+15줄) |
| `packages/api/src/services/kpi-logger.ts` | F125 | getPhase4Kpi() 메서드 추가 | 중간 (+40줄) |
| `packages/api/src/routes/kpi.ts` | F125 | GET /kpi/phase4 엔드포인트 | 소폭 (+25줄) |
| `packages/web/src/app/(app)/analytics/page.tsx` | F125 | Phase4KpiSection 컴포넌트 | 중간 (+60줄) |
| `packages/web/src/lib/api-client.ts` | F125 | fetchPhase4Kpi() 함수 | 소폭 (+10줄) |
| `packages/api/src/schemas/common.ts` | F128 | ErrorSchema → 하위호환 유지 + import | 소폭 (+5줄) |
| `packages/api/src/index.ts` | F128 | app.onError() 핸들러 | 소폭 (+15줄) |
| `packages/api/src/routes/auth.ts` | F128 | errorResponse() 마이그레이션 6곳 | 소폭 |
| `packages/api/src/routes/agent.ts` | F128 | errorResponse() 마이그레이션 4곳 | 소폭 |
| `packages/api/src/routes/spec.ts` | F128 | errorResponse() 마이그레이션 3곳 | 소폭 |
| `docs/specs/prd-v5.md` | F127 | MVP 체크리스트 6건 ✅ 갱신 | 소폭 |

### 4.3 문서 파일

| 파일 | F# | 설명 |
|------|----|------|
| `docs/specs/phase-4-go-decision.md` | F125 | Go 판정 문서 |
| `docs/specs/prd-v5.md` | F127 | MVP 체크리스트 갱신 |

---

## 5. Worker 배분 상세

### W1: 프론트엔드 + 배포 (F123, F124, F125 UI)

**허용 파일:**
```
packages/web/src/components/feature/ServiceContainer.tsx
packages/web/src/components/feature/ServiceLoadingSkeleton.tsx (신규)
packages/web/src/components/feature/ServiceErrorBoundary.tsx (신규)
packages/web/src/app/(app)/analytics/page.tsx
packages/web/src/lib/api-client.ts (fetchPhase4Kpi 추가만)
packages/shared/src/sso.ts (FoundryMessage 타입만)
```

**금지 파일:** CLAUDE.md, SPEC.md, MEMORY.md, packages/api/**, docs/**

### W2: 백엔드 + 품질 (F126, F128)

**허용 파일:**
```
packages/api/src/services/harness-rules.ts (신규)
packages/api/src/routes/harness.ts (신규)
packages/api/src/schemas/harness.ts (신규)
packages/api/src/schemas/error.ts (신규)
packages/api/src/schemas/common.ts
packages/api/src/index.ts (onError만)
packages/api/src/routes/auth.ts (errorResponse 마이그레이션만)
packages/api/src/routes/agent.ts (errorResponse 마이그레이션만)
packages/api/src/routes/spec.ts (errorResponse 마이그레이션만)
packages/web/e2e/integration-path.spec.ts (신규)
```

**금지 파일:** CLAUDE.md, SPEC.md, MEMORY.md, packages/web/src/**, packages/shared/**

### 리더: API + 문서 + 통합 (F123 배포, F125 API, F127)

- D1 0018 remote + Workers 배포
- kpi-logger.ts getPhase4Kpi() + kpi.ts 라우트
- PRD v5 MVP 갱신 + Go 판정 문서
- SPEC.md 최종 갱신
- typecheck + lint + 전체 테스트

---

## 6. Test Plan

### 6.1 단위 테스트 (예상 ~36건)

| 서비스 | 테스트 파일 | 예상 건수 | 담당 |
|--------|-------------|:---------:|:----:|
| HarnessRulesService | `harness-rules.test.ts` | 10 | W2 |
| ErrorResponse 헬퍼 | `error.test.ts` | 6 | W2 |
| 기존 라우트 에러 마이그레이션 | 기존 테스트 수정 | 8 | W2 |
| KpiLogger.getPhase4Kpi | `kpi-logger.test.ts` 확장 | 6 | 리더 |
| ServiceContainer postMessage | `ServiceContainer.test.tsx` | 6 | W1 |

### 6.2 E2E 테스트 (예상 4건)

| 시나리오 | 파일 | 담당 |
|----------|------|:----:|
| iframe SSO 토큰 전달 | `integration-path.spec.ts` | W2 |
| BFF 프록시 API | `integration-path.spec.ts` | W2 |
| 엔티티 레지스트리 크로스 쿼리 | `integration-path.spec.ts` | W2 |
| 서브앱 에러 바운더리 | `integration-path.spec.ts` | W2 |

### 6.3 기존 테스트 통과 확인

- API: 550+ tests (기존 에러 응답 형식 변경 시 수정 필요)
- Web: 48 tests
- CLI: 112 tests
- E2E: 51+ specs

---

## 7. API Spec Summary

### 7.1 신규 엔드포인트 (3개)

| Method | Path | Auth | F# | 설명 |
|--------|------|:----:|:--:|------|
| GET | `/api/kpi/phase4` | ✅ | F125 | Phase 4 KPI (K7/K8/K9) |
| GET | `/api/harness/rules/:projectId` | ✅ | F126 | 규칙 검사 실행 |
| GET | `/api/harness/violations/:projectId` | ✅ | F126 | 위반 이력 조회 |

### 7.2 수정 엔드포인트

| Method | Path | 변경 | F# |
|--------|------|------|:--:|
| POST | `/api/auth/signup` | errorResponse 적용 | F128 |
| POST | `/api/auth/login` | errorResponse 적용 | F128 |
| POST | `/api/agents/:id/execute` | errorResponse 적용 | F128 |
| POST | `/api/spec/generate` | errorResponse 적용 | F128 |
| (기타 10+곳) | | 점진적 마이그레이션 | F128 |

---

## 8. Migration & Deployment

### 8.1 D1 Migration

**Sprint 30은 D1 migration 추가 없음.**
- kpi_events 테이블의 event_type은 TEXT 타입 (CHECK 제약 없음) → 'harness_violation' 직접 INSERT 가능
- 기존 0018까지 remote 적용 (F123)

### 8.2 Workers 배포 순서

1. **Phase 1**: D1 0018 remote 적용 → Workers v2.2.0 배포 (F123)
2. **Phase 4**: Sprint 30 코드 완성 후 Workers v2.4.0 배포 (전체 기능 포함)

---

## 9. Risks Revisited

| Risk | Mitigation (Design 레벨) |
|------|--------------------------|
| ErrorResponse 마이그레이션 시 기존 테스트 깨짐 | `errorResponse()` 헬퍼가 동일 HTTP status 유지, 테스트에서 body 검증 패턴만 변경 |
| ServiceContainer iframe sandbox 제한 | `allow-scripts allow-same-origin allow-forms allow-popups` 유지, origin 화이트리스트로 보안 확보 |
| agent_tasks 테이블에 tenant_id가 없을 수 있음 | K8 쿼리 시 tenant_id 조건 분기 (없으면 전체 집계) |
| kpi_events에 실 데이터 없음 | Go 판정 문서에 "기술적 준비 완료, 실사용 데이터 대기" 명시 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | Initial draft — 6 features detailed design | Sinclair Seo |
