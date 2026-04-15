---
id: FX-DESIGN-SPRINT-298
title: Sprint 298 Design — fx-ai-foundry-os MVP (F545~F549)
sprint: 298
features: [F545, F546, F547, F548, F549]
created: 2026-04-16
status: approved
---

# Sprint 298 Design — fx-ai-foundry-os MVP

## 1. 아키텍처 개요

```
┌─ Foundry-X Web (packages/web) ─────────────────────┐
│  /ai-foundry-os            → index.tsx (3-Plane 랜딩)│
│  /ai-foundry-os/demo/lpon  → lpon.tsx (LPON 시연)   │
│  /ai-foundry-os/harness    → harness.tsx            │
│  /ai-foundry-os/ontology   → ontology.tsx (D3 KG)   │
└───────────────────────────────────┬────────────────┘
                                    │ fetch /api/decode/*
┌─ Foundry-X API (packages/api) ────┼────────────────┐
│  core/decode-bridge/routes/       │                 │
│  ├─ POST /api/decode/analyze      │                 │
│  ├─ GET  /api/decode/analysis/:id │                 │
│  ├─ GET  /api/decode/findings     │                 │
│  ├─ GET  /api/decode/compare      │                 │
│  ├─ GET  /api/decode/export/:id   │                 │
│  └─ GET  /api/decode/ontology/*   │                 │
└───────────────────────────────────┼────────────────┘
                                    │ Service Binding
┌─ Decode-X Workers ────────────────┘                 │
│  svc-extraction: /analyze, /analysis/*, /export/*   │
│  svc-ontology:  /graph/visualization, /terms        │
└─────────────────────────────────────────────────────┘
```

## 2. D1 Migration

없음 — Decode-X D1 직접 접근 안 함. Foundry-X D1 스키마 변경 없음.

## 3. API 설계 (F546 — decode-bridge)

### 3.1 라우트 (Hono sub-app)

| Method | Path | Decode-X 대응 | 설명 |
|--------|------|--------------|------|
| POST | `/api/decode/analyze` | svc-extraction POST `/extract` | 문서 분석 시작 |
| GET | `/api/decode/analysis/:documentId/summary` | svc-extraction GET `/analysis/:id/summary` | 분석 요약 |
| GET | `/api/decode/analysis/:documentId/findings` | svc-extraction GET `/analysis/:id/findings` | 진단 결과 |
| GET | `/api/decode/analysis/:documentId/compare` | svc-extraction GET `/analysis/compare` | 비교 분석 |
| GET | `/api/decode/export/:documentId` | svc-extraction GET `/export/spec/:id` | 반제품 spec export |
| GET | `/api/decode/ontology/graph` | svc-ontology GET `/graph/visualization` | KG force-graph 데이터 |
| GET | `/api/decode/ontology/terms` | svc-ontology GET `/terms` | 온톨로지 용어 목록 |
| GET | `/api/decode/harness/metrics` | Foundry-X 자체 DB 조회 | Harness 지표 mock |

### 3.2 환경변수 / Secret

```toml
# wrangler.toml에 추가 (production + dev 공통)
[[services]]
binding = "SVC_EXTRACTION"
service = "svc-extraction"
entrypoint = "default"

[[services]]
binding = "SVC_ONTOLOGY"
service = "svc-ontology"
entrypoint = "default"
```

- `DECODE_X_INTERNAL_SECRET` — wrangler secret put으로 등록 (Decode-X INTERNAL_API_SECRET 값)
- Service Binding 실패 시 fallback: `DECODE_X_EXTRACTION_URL`, `DECODE_X_ONTOLOGY_URL` env vars

### 3.3 Zod 스키마

```typescript
// packages/api/src/core/decode-bridge/schemas/index.ts
export const AnalysisResultSchema = z.object({
  documentId: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  score: z.number().optional(),
  summary: z.string().optional(),
});

export const GraphVisualizationSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    type: z.string(),
    group: z.string().optional(),
  })),
  edges: z.array(z.object({
    source: z.string(),
    target: z.string(),
    label: z.string().optional(),
  })),
});

export const HarnessMetricsSchema = z.object({
  ktConnectivity: z.number().min(0).max(100),
  businessViability: z.number().min(0).max(100),
  riskLevel: z.number().min(0).max(100),
  aiReadiness: z.number().min(0).max(100),
  concreteness: z.number().min(0).max(100),
});
```

### 3.4 decode-client.ts (Service Binding + fetch fallback)

```typescript
// packages/api/src/core/decode-bridge/services/decode-client.ts
export async function callExtractionService(
  env: Env,
  path: string,
  method: string,
  body?: unknown
): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'X-Internal-Secret': env.DECODE_X_INTERNAL_SECRET ?? '',
  };
  
  // Service Binding 우선
  if (env.SVC_EXTRACTION) {
    return env.SVC_EXTRACTION.fetch(new Request(`https://svc-extraction${path}`, {
      method, headers, body: body ? JSON.stringify(body) : undefined,
    }));
  }
  
  // fallback: direct fetch
  const baseUrl = env.DECODE_X_EXTRACTION_URL ?? 'https://svc-extraction.ktds-axbd.workers.dev';
  return fetch(`${baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
}
```

### 3.5 Mock Fallback

Decode-X 연동 실패 시 (timeout/auth failure) LPON 사전 캡처 데이터 반환:

```typescript
// packages/api/src/core/decode-bridge/data/lpon-mock.ts
export const LPON_MOCK_ANALYSIS = { /* 사전 캡처 */ };
export const LPON_MOCK_GRAPH = {
  nodes: [/* 10+ 노드 */],
  edges: [/* 엣지 */],
};
```

## 4. Web 설계 (F545/F547/F548/F549)

### 4.1 파일 구조

```
packages/web/src/routes/
├── ai-foundry-os/
│   ├── index.tsx          # F545: 3-Plane 랜딩
│   ├── demo/
│   │   └── lpon.tsx       # F547: LPON 시연
│   ├── harness.tsx        # F548: Harness 5종
│   └── ontology.tsx       # F549: KG XAI 뷰어
└── router.tsx             # 기존 — 4개 라우트 추가
```

### 4.2 router.tsx 추가 (app.ts children 블록)

```typescript
// /ai-foundry-os/* — F545~F549 (인증 불필요 — 데모 시연용)
{ path: "ai-foundry-os", lazy: () => import("@/routes/ai-foundry-os/index") },
{ path: "ai-foundry-os/demo/lpon", lazy: () => import("@/routes/ai-foundry-os/demo/lpon") },
{ path: "ai-foundry-os/harness", lazy: () => import("@/routes/ai-foundry-os/harness") },
{ path: "ai-foundry-os/ontology", lazy: () => import("@/routes/ai-foundry-os/ontology") },
```

**인증 정책**: `/ai-foundry-os/*` 는 대표 보고 데모용으로 인증 없이 접근 허용
(ProtectedRoute 바깥에 배치 — roadmap/changelog와 동일 패턴)

### 4.3 F545 — 3-Plane 랜딩 (index.tsx)

**컴포넌트 구조**:
- 헤더: "AI Foundry OS" + DeepDive v0.3 인용 문구
- 3-Plane 카드 그리드 (Input / Control / Presentation)
  - Input Plane: Decode-X 아이콘 + "지식 추출 엔진" + "라이브 시연→" 버튼
  - Control Plane: Harness 체크리스트 링크
  - Presentation Plane: KG XAI 뷰어 링크
- 하단: "LPON 온누리상품권 반제품" 배지 + 요약 카드

**상태**: 정적 UI (데이터 fetch 없음)

### 4.4 F547 — LPON Type 1 시연 (lpon.tsx)

**화면 구성**:
1. 상단: "온누리상품권 취소 (LPON)" 배너 + 3-Pass 뱃지
2. 탭: `Scoring` | `Diagnosis` | `Comparison`
3. 각 탭: `/api/decode/analysis/lpon-demo/[summary|findings|compare]` 결과 렌더링
4. 우측: "Type 1 반제품 다운로드" 버튼 → `/api/decode/export/lpon-demo` → zip 다운로드

**상태관리**: `useState` (탭 선택) + `useEffect` + `fetch`

**Fallback**: API 실패 시 mock 데이터 정적 렌더링

### 4.5 F548 — Harness 체크리스트 (harness.tsx)

**5종 항목**:
| # | 항목 | 지표 소스 |
|---|------|---------|
| 1 | KT연계성 | mock (100%) |
| 2 | 사업성 | mock (75%) |
| 3 | 리스크 | mock (85%) |
| 4 | AI-Ready Data | mock (90%) |
| 5 | 구체화 수준 | Foundry-X DB: agent_improvement_proposals 카운트 |

**UI**: 5개 Progress Bar + 색상 코딩 (green/yellow/red) + 세부 설명 드롭다운

### 4.6 F549 — KG XAI 뷰어 (ontology.tsx)

**D3 설치 여부**: 없으면 `pnpm add --filter web d3` 추가
- 대안: `@nivo/network` 또는 SVG 직접 렌더링 (d3-force-simulation 없이)

**데이터 소스**: `GET /api/decode/ontology/graph` → `GraphVisualizationSchema`

**인터랙션**:
- 노드 hover: 툴팁 (label + type)
- 노드 클릭: 연결 엣지 하이라이트 ("이 결정의 근거 경로")
- 범례: 노드 타입별 색상 (SubProcess/Method/Condition/Actor 등)

**Fallback**: API 실패 시 10+ 노드 mock 데이터 (LPON 도메인 기반)

## 5. 파일 매핑 (D1 체크리스트)

### 신규 파일

| 파일 | F-item | 설명 |
|------|--------|------|
| `packages/api/src/core/decode-bridge/routes/index.ts` | F546 | Hono sub-app, 8개 라우트 |
| `packages/api/src/core/decode-bridge/services/decode-client.ts` | F546 | Service Binding + fetch |
| `packages/api/src/core/decode-bridge/schemas/index.ts` | F546 | Zod 스키마 |
| `packages/api/src/core/decode-bridge/data/lpon-mock.ts` | F546/F547 | Mock 데이터 |
| `packages/web/src/routes/ai-foundry-os/index.tsx` | F545 | 3-Plane 랜딩 |
| `packages/web/src/routes/ai-foundry-os/demo/lpon.tsx` | F547 | LPON 시연 |
| `packages/web/src/routes/ai-foundry-os/harness.tsx` | F548 | Harness UI |
| `packages/web/src/routes/ai-foundry-os/ontology.tsx` | F549 | KG XAI 뷰어 |

### 수정 파일

| 파일 | F-item | 변경 내용 |
|------|--------|---------|
| `packages/api/src/core/index.ts` | F546 | `decodeBridgeRoute` export 추가 |
| `packages/api/src/app.ts` | F546 | `app.route("/api", decodeBridgeRoute)` 1줄 |
| `packages/api/src/env.ts` | F546 | `SVC_EXTRACTION`, `SVC_ONTOLOGY`, `DECODE_X_INTERNAL_SECRET` 타입 추가 |
| `packages/api/wrangler.toml` | F546 | `[[services]]` binding 2개 추가 |
| `packages/web/src/router.tsx` | F545/F547/F548/F549 | 4개 라우트 추가 |

### D1 체크리스트 (Stage 3 Exit)

- [x] D1: 주입 사이트 전수 검증 — decode-bridge는 독립 모듈, 기존 도메인 import 없음. `app.ts`에 mount 1곳만 추가
- [x] D2: 식별자 계약 — `documentId` = Decode-X가 발급 (UUID), Foundry-X는 pass-through. LPON 데모용 고정값 `"lpon-demo"` 사용
- [x] D3: Breaking change — 신규 파일만 추가, 기존 코드 수정 최소화 (env.ts + wrangler.toml + router.tsx + core/index.ts + app.ts 1줄씩)
- [ ] D4: TDD Red 파일 존재 → 구현 중 완성 예정

## 6. TDD 테스트 계약 (Red Phase)

### F546 (필수 — 새 API 서비스 로직)

```typescript
// packages/api/src/core/decode-bridge/__tests__/routes.test.ts
describe('F546 decode-bridge routes', () => {
  it('GET /api/decode/ontology/graph returns graph data', async () => {});
  it('GET /api/decode/harness/metrics returns 5 metrics', async () => {});
  it('returns mock fallback when Decode-X unreachable', async () => {});
  it('rejects request without auth token', async () => {});
});
```

### F545/F547/F548/F549 (E2E — 권장)

Playwright smoke test: 4개 라우트 접근 가능 확인

## 7. 배포 변경사항

```
wrangler.toml에 [[services]] 추가 → 기존 deploy.yml 자동 처리
DECODE_X_INTERNAL_SECRET: wrangler secret put DECODE_X_INTERNAL_SECRET (수동 1회)
```

## 8. Mock 데이터 설계 (LPON 도메인)

```typescript
// LPON 온누리상품권 취소 도메인 기반 10개 KG 노드
export const LPON_MOCK_GRAPH = {
  nodes: [
    { id: 'n1', label: '취소신청접수', type: 'SubProcess', group: 'cancel' },
    { id: 'n2', label: '잔액확인', type: 'Method', group: 'validation' },
    { id: 'n3', label: '취소가능조건', type: 'Condition', group: 'rule' },
    { id: 'n4', label: '고객', type: 'Actor', group: 'actor' },
    { id: 'n5', label: '온누리상품권앱', type: 'Actor', group: 'actor' },
    { id: 'n6', label: '취소처리', type: 'SubProcess', group: 'cancel' },
    { id: 'n7', label: '환불계좌검증', type: 'Method', group: 'validation' },
    { id: 'n8', label: '환불금액계산', type: 'Method', group: 'calculation' },
    { id: 'n9', label: '취소완료알림', type: 'Method', group: 'notification' },
    { id: 'n10', label: '취소이력저장', type: 'Requirement', group: 'audit' },
    { id: 'n11', label: '취소불가조건', type: 'Condition', group: 'rule' },
    { id: 'n12', label: '부분취소허용', type: 'Condition', group: 'rule' },
  ],
  edges: [
    { source: 'n4', target: 'n1', label: '신청' },
    { source: 'n1', target: 'n2', label: '→' },
    { source: 'n2', target: 'n3', label: '→' },
    { source: 'n3', target: 'n6', label: '가능시' },
    { source: 'n3', target: 'n11', label: '불가시' },
    { source: 'n5', target: 'n1', label: '인터페이스' },
    { source: 'n6', target: 'n7', label: '→' },
    { source: 'n7', target: 'n8', label: '→' },
    { source: 'n8', target: 'n9', label: '→' },
    { source: 'n6', target: 'n10', label: '기록' },
    { source: 'n3', target: 'n12', label: '→' },
  ],
};
```
