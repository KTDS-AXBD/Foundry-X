---
code: FX-DSGN-S135
title: "Sprint 135 — F316 Discovery E2E 테스트 Design"
version: "1.0"
status: Active
category: DSGN
created: 2026-04-05
updated: 2026-04-05
author: Claude Code
sprint: 135
features: [F316]
plan: "[[FX-PLAN-S135]]"
---

# Sprint 135 Design — F316 Discovery E2E 테스트

## 1. 설계 요약

F316은 **E2E 테스트 전용 Sprint**으로, 기존 Discovery 관련 페이지의 E2E 커버리지를 확대한다.

### 1.1 현상 분석

| 컴포넌트 | 라우트 연결 | E2E 커버리지 |
|----------|-----------|-------------|
| DiscoveryWizard (`/discovery/items`) | ✅ | 4건 (F263) |
| HITL Review Panel | ✅ (위저드 내 산출물 클릭) | 4건 (F266) |
| Pipeline Dashboard (`/validation/pipeline`) | ✅ | 4건 (F232) |
| Discovery Detail (`/ax-bd/items/:id`) | ✅ | 1건 (detail-pages.spec.ts) |
| Discover Dashboard (`/ax-bd/discover`) | ✅ | 0건 |
| **CheckpointReviewPanel** (F314) | ❌ 미연결 (F315 예정) | 0건 |
| **AutoAdvanceToggle** (F314) | ❌ 미연결 (F315 예정) | 0건 |
| **PipelineTimeline** (F314) | ❌ 미연결 (F315 예정) | 0건 |

### 1.2 E2E 전략 (2트랙)

**Track A: 기존 Discovery 페이지 E2E 강화** (7건)
- 이미 라우트에 연결된 페이지의 심화 시나리오

**Track B: F314 컴포넌트 직접 테스트** (3건)
- 라우트 미연결 컴포넌트를 Playwright 내에서 직접 렌더링
- 방법: 테스트용 HTML 페이지에 React 컴포넌트 마운트 (또는 기존 페이지에 mock inject)
- **대안**: API mock 기반으로 discovery-pipeline API 엔드포인트 호출 패턴만 검증

> **결정**: Track B는 F315(라우트 연결)가 미완이므로, 컴포넌트 단위 테스트 대신 **API integration 수준 E2E**로 설계. discovery-pipeline API를 mock하고, 향후 F315 완료 시 UI 통합 테스트로 전환 가능하도록 mock 데이터를 factory에 준비.

## 2. 테스트 시나리오 상세

### 2.1 Track A: 기존 페이지 E2E 강화

#### File: `e2e/discovery-wizard-advanced.spec.ts` (4건)

**T1. 위저드 — 아이템 전환 시 스텝퍼 갱신**
```
1. /discovery/items 접속
2. 아이템 드롭다운에서 두 번째 아이템 선택
3. 스텝퍼 완료 카운트가 갱신됨을 확인
Mock: biz-items(2건), discovery-progress(아이템별 다른 진행 상태)
```

**T2. 위저드 — 전체 완료(11/11) 상태에서 완료 표시**
```
1. /discovery/items 접속 (모든 stage completed mock)
2. "11 / 11 완료" 텍스트 확인
3. 모든 스텝퍼 버튼에 완료 아이콘 표시
Mock: stages 11개 모두 completed
```

**T3. 위저드 — 트래픽 라이트 표시**
```
1. /discovery/items 접속
2. 신호등(green/yellow/red) 표시 확인
3. summary 수치 표시 (go/pivot/drop)
Mock: traffic-light 응답
```

**T4. 위저드 — 빈 아이템 리스트 상태**
```
1. /discovery/items 접속 (빈 items mock)
2. 빈 상태 메시지 또는 생성 유도 표시 확인
Mock: items: [], total: 0
```

#### File: `e2e/discovery-detail-advanced.spec.ts` (3건)

**T5. 상세 — 프로세스 진행률 바 표시**
```
1. /ax-bd/items/biz-1 접속
2. 프로세스 진행률 바 렌더링 확인
3. 현재 단계에 ring 스타일 적용
4. 완료 카운트 "3/11 단계 완료" 표시
Mock: biz-item detail + discovery-progress (3 completed)
```

**T6. 상세 — 산출물 목록 표시**
```
1. /ax-bd/items/biz-1 접속
2. ArtifactList 렌더링 확인
3. 산출물 제목 + 스킬명 + 상태 표시
Mock: biz-item detail + artifacts 목록
```

**T7. 상세 — 뒤로가기(위저드) 링크**
```
1. /ax-bd/items/biz-1 접속
2. ArrowLeft 링크 클릭
3. /discovery/items로 이동 확인
Mock: biz-item detail
```

### 2.2 Track B: 파이프라인 API E2E (3건)

#### File: `e2e/discovery-pipeline-api.spec.ts` (3건)

> F314 API 엔드포인트를 mock하고, Web 페이지에서 간접 호출 패턴 검증.
> F315에서 UI 연결 후 이 테스트를 확장할 수 있도록 mock-factory에 데이터 준비.

**T8. 파이프라인 생성 + 목록 조회 mock 검증**
```
1. mock-factory의 makePipelineRun() 데이터 검증
2. /ax-bd/discover 접속 (향후 파이프라인 목록 표시 예정)
3. discover-dashboard 탭 구조 렌더링 확인
4. 파이프라인 API mock 가용성 확인 (route intercept)
Mock: discovery-pipeline/runs 목록 + biz-items
```

**T9. 발굴 대시보드 — 탭 전환 (진행추적/9기준/산출물)**
```
1. /ax-bd/discover 접속
2. 탭 3개 표시 확인 (진행 추적, 9기준 진행률, 산출물)
3. 각 탭 클릭 → 해당 콘텐츠 렌더링
Mock: portfolio-progress + discovery-progress + artifacts
```

**T10. 체크포인트 factory 데이터 검증 + 미래 통합 준비**
```
1. mock-factory의 makeCheckpoint() 데이터 구조 검증
2. /discovery/items 접속
3. discovery-pipeline/runs mock 설정
4. checkpoint API mock 설정 (approve/reject)
5. F315 완료 후 이 mock을 활용한 UI 테스트로 확장 가능
Mock: checkpoint 데이터 + pipeline runs
```

## 3. mock-factory 확장

```typescript
// ── Pipeline Run (discovery-pipeline/runs) ──
export function makePipelineRun(overrides?: Record<string, unknown>) {
  return {
    id: "run-1",
    bizItemId: "biz-item-1",
    orgId: "test-org-e2e",
    status: "discovery_running",
    currentStep: "2-3",
    autoAdvanceEnabled: true,
    startedAt: "2026-04-01T00:00:00Z",
    completedAt: null,
    steps: [
      { stepId: "2-0", status: "completed", startedAt: "2026-04-01T00:00:00Z", completedAt: "2026-04-01T00:05:00Z" },
      { stepId: "2-1", status: "completed", startedAt: "2026-04-01T00:05:00Z", completedAt: "2026-04-01T00:10:00Z" },
      { stepId: "2-2", status: "completed", startedAt: "2026-04-01T00:10:00Z", completedAt: "2026-04-01T00:15:00Z" },
      { stepId: "2-3", status: "in_progress", startedAt: "2026-04-01T00:15:00Z", completedAt: null },
      { stepId: "2-4", status: "pending", startedAt: null, completedAt: null },
    ],
    createdAt: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

// ── Checkpoint (discovery-pipeline/runs/:id/checkpoints) ──
export function makeCheckpoint(overrides?: Record<string, unknown>) {
  return {
    id: "cp-1",
    pipelineRunId: "run-1",
    stepId: "2-5",
    checkpointType: "commit_gate",
    status: "pending",
    questions: [
      { question: "시장 규모가 충분한가?", required: true },
      { question: "기술 실현 가능성은?", required: true },
      { question: "경쟁 우위 요소는?", required: true },
      { question: "투자 대비 ROI 예상은?", required: true },
    ],
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    decidedBy: null,
    decidedAt: null,
    createdAt: "2026-04-01T00:15:00Z",
    ...overrides,
  };
}
```

## 4. 변경 파일 매핑

| # | 파일 | 동작 | 라인 추정 |
|---|------|------|-----------|
| 1 | `e2e/fixtures/mock-factory.ts` | 수정 — `makePipelineRun()`, `makeCheckpoint()` 추가 | +60 |
| 2 | `e2e/discovery-wizard-advanced.spec.ts` | **신규** — 위저드 심화 4건 | ~180 |
| 3 | `e2e/discovery-detail-advanced.spec.ts` | **신규** — 상세 페이지 심화 3건 | ~150 |
| 4 | `e2e/discovery-pipeline-api.spec.ts` | **신규** — 파이프라인 API + 대시보드 3건 | ~200 |
| **합계** | 3 신규 + 1 수정 | ~590 라인 |

## 5. Skip 사유 추적

| 시나리오 | Skip 여부 | 사유 |
|----------|-----------|------|
| CheckpointReviewPanel UI 직접 테스트 | Skip | F315에서 라우트 연결 예정, 현재 어느 페이지에서도 import하지 않음 |
| AutoAdvanceToggle UI 직접 테스트 | Skip | 동일 사유 |
| PipelineTimeline UI 직접 테스트 | Skip | 동일 사유 |

> 위 3개 컴포넌트는 F315(Sprint 134) 완료 시 라우트에 연결되면 해당 Sprint에서 UI E2E 추가 예정. 이번 Sprint에서는 mock-factory에 데이터만 준비하고, API 수준 검증 + 기존 페이지 심화로 대체.

## 6. 검증 기준

```bash
cd packages/web
pnpm e2e -- --grep "Discovery Wizard Advanced|Discovery Detail Advanced|Discovery Pipeline API"
```

| 기준 | 목표 |
|------|------|
| 신규 10건 전체 pass | ✅ |
| skip 0건 | ✅ |
| 기존 E2E 회귀 0건 | ✅ |
| mock-factory 함수 2개 추가 | ✅ |
