---
code: FX-DSGN-S124
title: "E2E 상세 페이지(:id) 커버리지 확장 — 설계"
version: "1.0"
status: Active
category: DSGN
feature: F302
sprint: 124
created: 2026-04-04
updated: 2026-04-04
author: Claude (Autopilot)
ref: "[[FX-PLAN-S124]]"
---

## 1. 개요

F302는 `:id` 파라미터 기반 상세 페이지 10개에 대한 E2E 테스트를 추가하는 작업이에요. Mock factory 패턴을 도입하여 테스트 데이터의 일관성을 보장하고, hitl-review skip 4건을 재활성화해요.

## 2. 파일 구조

### 2.1 신규 생성

| 파일 | 용도 | LoC 예상 |
|------|------|----------|
| `packages/web/e2e/fixtures/mock-factory.ts` | 상세 페이지 mock 데이터 factory | ~120 |
| `packages/web/e2e/detail-pages.spec.ts` | 상세 페이지 E2E 10건 | ~350 |

### 2.2 수정

| 파일 | 변경 | LoC 예상 |
|------|------|----------|
| `packages/web/e2e/hitl-review.spec.ts` | skip 4건 → mock 기반 활성화 | ~40 변경 |

## 3. Mock Factory 설계

### 3.1 `e2e/fixtures/mock-factory.ts`

각 도메인 엔티티에 대한 기본값 + override 패턴. 기존 `packages/cli/src/ui/__tests__/test-data.ts`와 동일한 `make*()` + spread 패턴을 따라요.

```typescript
// ── BizItem (discovery/items/:id) ──
export function makeBizItem(overrides?: Record<string, unknown>) {
  return {
    id: "biz-item-1",
    title: "AI 헬스케어 플랫폼",
    description: "AI 기반 건강관리 서비스",
    type: "I",
    stage: "discovery",
    orgId: "test-org-e2e",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── Idea (ax-bd/ideas/:id) ──
export function makeIdea(overrides?: Record<string, unknown>) {
  return {
    id: "idea-1",
    title: "스마트 팩토리 솔루션",
    description: "제조 공정 자동화",
    tags: ["AI", "제조"],
    syncStatus: "synced",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── BMC (ax-bd/bmc/:id) ──
export function makeBmc(overrides?: Record<string, unknown>) {
  return {
    id: "bmc-1",
    bizItemId: "biz-item-1",
    customer_segments: "B2B 제조업체",
    value_propositions: "공정 효율화 30%",
    channels: "직접 영업",
    customer_relationships: "전담 매니저",
    revenue_streams: "SaaS 구독",
    key_resources: "AI 모델",
    key_activities: "모델 학습",
    key_partnerships: "클라우드 벤더",
    cost_structure: "인프라 + 인건비",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── BDP (ax-bd/bdp/:bizItemId) ──
export function makeBdpVersion(overrides?: Record<string, unknown>) {
  return {
    id: "bdp-v1",
    bizItemId: "biz-item-1",
    version: 1,
    content: "## 사업 개발 계획\n\n### 시장 분석\n- 타겟: B2B",
    status: "draft",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── SR (collection/sr/:id) ──
export function makeSrDetail(overrides?: Record<string, unknown>) {
  return {
    id: "sr-1",
    title: "시장 조사 리포트",
    description: "AI 헬스케어 시장 규모 분석",
    sr_type: "market_research",
    status: "completed",
    priority: "high",
    confidence: 85,
    keywords: ["AI", "헬스케어"],
    sourceUrl: "https://example.com",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── Offering Pack (shaping/offering/:id) ──
export function makeOfferingPack(overrides?: Record<string, unknown>) {
  return {
    id: "pack-1",
    title: "AI 헬스케어 제안 패키지",
    status: "draft",
    bizItemId: "biz-item-1",
    items: [],
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ── Outreach (gtm/outreach/:id) ──
export function makeOutreach(overrides?: Record<string, unknown>) {
  return {
    id: "outreach-1",
    customerId: "customer-1",
    bizItemId: "biz-item-1",
    status: "draft",
    channel: "email",
    proposalContent: "제안서 초안",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeCustomer(overrides?: Record<string, unknown>) {
  return {
    id: "customer-1",
    name: "테스트 고객사",
    industry: "제조",
    contactEmail: "test@example.com",
    ...overrides,
  };
}

// ── Shaping Run (shaping/review/:runId) ──
export function makeShapingRun(overrides?: Record<string, unknown>) {
  return {
    id: "run-1",
    discoveryPrdId: "prd-1",
    status: "completed",
    mode: "full",
    currentPhase: "F",
    qualityScore: 85,
    tokenCost: 1200,
    tokenLimit: 5000,
    gitPath: null,
    createdAt: "2026-01-01T00:00:00Z",
    completedAt: "2026-01-02T00:00:00Z",
    phaseLogs: [],
    expertReviews: [],
    sixHats: [],
    ...overrides,
  };
}

// ── Artifact (ax-bd/artifacts/:id) ──
export function makeArtifact(overrides?: Record<string, unknown>) {
  return {
    id: "artifact-1",
    bizItemId: "biz-item-1",
    skillId: "feasibility-study",
    title: "타당성 분석",
    content: "## 분석 결과\n\n시장 규모 1조원",
    version: 1,
    status: "completed",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}
```

## 4. E2E Spec 설계

### 4.1 `e2e/detail-pages.spec.ts`

각 테스트는 3단계 구조를 따라요:

1. **API Route Mock**: `page.route()` 로 해당 API 엔드포인트를 mock
2. **Navigate**: `page.goto()` 로 상세 페이지 이동
3. **Assert**: heading/제목/badge/뒤로가기 링크 확인

```
describe("상세 페이지(:id) 렌더링 검증")
  ├── test("discovery/items/:id — 사업 아이템 상세")
  │   mock: GET /biz-items/biz-item-1 → makeBizItem()
  │         GET /discovery/progress/biz-item-1 → { totalItems: 0, ... }
  │   assert: h1 "AI 헬스케어 플랫폼", ArrowLeft link → /discovery/items
  │
  ├── test("ax-bd/ideas/:id — 아이디어 상세")
  │   mock: GET /ax-bd/ideas → { items: [makeIdea()] }
  │   assert: h1 "스마트 팩토리 솔루션", tags visible
  │
  ├── test("ax-bd/bmc/:id — BMC 상세")
  │   mock: GET /ax-bd/bmc → { items: [makeBmc()] }
  │   assert: "가치 제안" 블록 visible, BMC 그리드 렌더링
  │
  ├── test("ax-bd/bdp/:bizItemId — BDP 상세")
  │   mock: GET /bdp/biz-item-1 → makeBdpVersion()
  │         GET /bdp/biz-item-1/reviews/summary → { total: 0, ... }
  │   assert: content heading visible, review section
  │
  ├── test("collection/sr/:id — SR 상세")
  │   mock: GET /sr/sr-1 → makeSrDetail()
  │   assert: h1 "시장 조사 리포트", badges (type, status, priority)
  │
  ├── test("shaping/offering/:id — 오퍼링 팩 상세")
  │   mock: GET /offering-packs/pack-1 → makeOfferingPack()
  │   assert: h1 "AI 헬스케어 제안 패키지", status badge
  │
  ├── test("shaping/offering/:id/brief — 오퍼링 브리프")
  │   mock: GET /offering-packs/pack-1 → makeOfferingPack()
  │         GET /offering-packs/pack-1/briefs → { items: [] }
  │   assert: pack title visible, briefs section
  │
  ├── test("gtm/outreach/:id — 아웃리치 상세")
  │   mock: GET /gtm/outreach/outreach-1 → makeOutreach()
  │         GET /gtm/customers/customer-1 → makeCustomer()
  │   assert: customer name visible, status controls
  │
  ├── test("shaping/review/:runId — 형상화 리뷰 상세")
  │   mock: GET /shaping/runs/run-1 → makeShapingRun()
  │   assert: status badge "완료", quality score visible
  │
  └── test("ax-bd/artifacts/:id — 산출물 상세")
      mock: GET /ax-bd/artifacts/artifact-1 → makeArtifact()
            GET /ax-bd/artifacts/biz-item-1/.../versions → { versions: [] }
      assert: title visible, content rendered
```

### 4.2 hitl-review.spec.ts Skip 재활성화

hitl-review.spec.ts의 4건은 `artifactLink.count() === 0` 조건부 skip이에요. Mock으로 artifact link를 제공하면 활성화 가능:

```typescript
// 기존: test.skip() — artifactLink 미존재
// 변경: mock으로 artifact 데이터 제공
await page.route("**/api/ax-bd/artifacts*", (route) =>
  route.fulfill({ json: { items: [makeArtifact()] } })
);
```

## 5. Worker 파일 매핑

단일 구현 (Worker 분리 불필요 — E2E 전용, 파일 2+1개):

| 파일 | 작업 |
|------|------|
| `packages/web/e2e/fixtures/mock-factory.ts` | 신규 — mock factory 10종 |
| `packages/web/e2e/detail-pages.spec.ts` | 신규 — 상세 페이지 E2E 10건 |
| `packages/web/e2e/hitl-review.spec.ts` | 수정 — skip 4건 mock 기반 활성화 |

## 6. 검증 계획

```bash
# Phase D: E2E 전체 실행
cd packages/web && pnpm e2e

# 기대 결과
# - detail-pages.spec.ts: 10/10 pass
# - hitl-review.spec.ts: skip 4건 → pass로 전환
# - 전체: 169 + 10 + 4 = ~183 tests, 0 fail
```

## 7. 비고

- offering-brief는 `fetchOfferingPackDetail` + `fetchOfferingBriefs` 2개 API를 동시 호출하므로 둘 다 mock 필요
- outreach-detail은 `fetchGtmOutreach` → `fetchGtmCustomer` 체인 — 순차 호출이므로 두 API 모두 mock
- shaping-detail은 `fetchApi(/shaping/runs/:runId)` 직접 호출
- artifact-detail은 ArtifactDetail 컴포넌트 내부에서 `fetchApi(/ax-bd/artifacts/:id)` + versions API 호출
