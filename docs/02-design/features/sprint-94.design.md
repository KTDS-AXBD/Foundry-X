---
code: FX-DSGN-094
title: "Sprint 94 Design — 발굴 UX: 위저드 UI(F263) + 온보딩 투어(F265)"
version: "1.0"
status: Active
category: DSGN
created: 2026-03-31
updated: 2026-03-31
author: Claude (Autopilot)
system-version: "1.8.0"
sprint: 94
f-items: [F263, F265]
plan-ref: "[[FX-PLAN-094]]"
---

# Sprint 94 Design — 발굴 UX: 위저드 UI + 온보딩 투어

## 1. Overview

Sprint 94는 발굴 프로세스 UX를 개선하는 두 기능을 구현해요:
- **F263**: 나열형 Discovery 페이지를 위저드/스텝퍼 중심으로 재구성 + biz-item별 진행 추적
- **F265**: 발굴 특화 인터랙티브 온보딩 투어 (5스텝)

---

## 2. DB 스키마

### 2.1 마이그레이션: `0077_biz_item_discovery_stages.sql`

```sql
CREATE TABLE IF NOT EXISTS biz_item_discovery_stages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('2-0','2-1','2-2','2-3','2-4','2-5','2-6','2-7','2-8','2-9','2-10')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')),
  started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(biz_item_id, stage)
);

CREATE INDEX idx_bids_biz_item ON biz_item_discovery_stages(biz_item_id);
CREATE INDEX idx_bids_org ON biz_item_discovery_stages(org_id);
```

---

## 3. API 설계

### 3.1 Zod 스키마: `packages/api/src/schemas/discovery-stage.ts`

```typescript
import { z } from "zod";

const STAGES = ['2-0','2-1','2-2','2-3','2-4','2-5','2-6','2-7','2-8','2-9','2-10'] as const;
const STATUSES = ['pending','in_progress','completed','skipped'] as const;

export const UpdateDiscoveryStageSchema = z.object({
  stage: z.enum(STAGES),
  status: z.enum(STATUSES),
});

export type StageId = z.infer<typeof UpdateDiscoveryStageSchema>['stage'];
export type StageStatus = z.infer<typeof UpdateDiscoveryStageSchema>['status'];
```

### 3.2 서비스: `packages/api/src/services/discovery-stage-service.ts`

```typescript
export class DiscoveryStageService {
  constructor(private db: D1Database) {}

  /** biz-item의 전 단계 상태 조회 (없으면 자동 초기화) */
  async getProgress(bizItemId: string, orgId: string): Promise<StageProgress[]>

  /** 특정 단계 상태 갱신 */
  async updateStage(bizItemId: string, orgId: string, stage: StageId, status: StageStatus): Promise<void>

  /** biz-item 생성 시 전 단계 pending으로 초기화 */
  async initStages(bizItemId: string, orgId: string): Promise<void>
}
```

**getProgress 반환 타입:**
```typescript
interface StageProgress {
  stage: string;        // "2-0" ~ "2-10"
  stageName: string;    // "사업 아이템 분류" 등
  status: string;       // pending | in_progress | completed | skipped
  startedAt: string | null;
  completedAt: string | null;
}
```

**initStages 로직:** 11개 단계(2-0~2-10)를 `pending` 상태로 일괄 INSERT. 이미 존재하면 skip (UPSERT).

### 3.3 라우트: `packages/api/src/routes/discovery-stages.ts`

```typescript
// GET /biz-items/:id/discovery-progress
// → DiscoveryStageService.getProgress(id, orgId)
// → { stages: StageProgress[], currentStage: string | null, completedCount: number, totalCount: 11 }

// POST /biz-items/:id/discovery-stage
// body: { stage: "2-1", status: "completed" }
// → DiscoveryStageService.updateStage(id, orgId, stage, status)
// → { ok: true, stage, status }
```

### 3.4 라우트 등록

`biz-items.ts` 하단에 discovery-stages 라우트를 마운트:
```typescript
import { discoveryStagesRoute } from "./discovery-stages.js";
bizItemsRoute.route("/", discoveryStagesRoute);
```

---

## 4. Web 컴포넌트 설계

### 4.1 파일 구조

```
packages/web/src/components/feature/discovery/
├── DiscoveryWizard.tsx       (F263 메인 — 아이템 선택 + 스텝퍼 + 상세)
├── WizardStepper.tsx         (수평 스텝퍼 바 — 11단계 진행 표시)
├── WizardStepDetail.tsx      (선택된 단계의 상세 패널)
└── DiscoveryTour.tsx         (F265 온보딩 투어)
```

### 4.2 DiscoveryWizard.tsx (F263 메인)

**Props:** 없음 (페이지 레벨 컴포넌트)

**State:**
- `selectedItemId: string | null` — 선택된 biz-item
- `stages: StageProgress[]` — 선택된 아이템의 단계 진행 상태
- `activeStage: string` — 현재 보고 있는 단계 ("2-0" ~ "2-10")

**레이아웃:**
```
┌─────────────────────────────────────────────────────┐
│ Discovery 프로세스 v8.2                              │
│ [ProcessFlowV82]  ← 기존 컴포넌트 유지              │
├─────────────────────────────────────────────────────┤
│ [아이템 선택 드롭다운] ← biz-item 리스트            │
├─────────────────────────────────────────────────────┤
│ [WizardStepper] ← 11단계 수평 진행 바              │
│  2-0  2-1  2-2  2-3  2-4  2-5  2-6  2-7  2-8 ...  │
│   ●────○────○────○────○────○────○────○────○         │
├─────────────────────────────────────────────────────┤
│ [WizardStepDetail]                                  │
│  ┌─ 목적 ──────────────────────────────────────┐   │
│  │ 이 단계에서는 레퍼런스를 분석하고...         │   │
│  ├─ 사용 스킬 ─────────────────────────────────┤   │
│  │ 🔧 competitor-analysis  🔧 market-research  │   │
│  ├─ 예상 산출물 ───────────────────────────────┤   │
│  │ 📄 경쟁 분석 보고서  📄 레퍼런스 정리       │   │
│  ├─ 사업성 질문 ───────────────────────────────┤   │
│  │ "여기까지 봤을 때, 뭔가 다르게..."          │   │
│  ├─ 다음 단계 ─────────────────────────────────┤   │
│  │ → 2-2 수요 시장 검증                        │   │
│  └─ [상태 변경] pending → in_progress → done   │   │
└─────────────────────────────────────────────────────┘
│ [아이템 리스트] ← 기존 리스트 유지                  │
└─────────────────────────────────────────────────────┘
```

### 4.3 WizardStepper.tsx

**Props:**
```typescript
interface WizardStepperProps {
  stages: StageProgress[];
  activeStage: string;
  onStageClick: (stage: string) => void;
  discoveryType?: string | null; // 유형별 강도 색상 반영
}
```

**동작:**
- 11단계를 수평 스텝 노드로 표시
- completed → 체크마크(✓) + 초록, in_progress → 파란 점멸, pending → 회색 원
- 클릭 시 해당 단계 상세 패널 표시
- 2-5(Commit Gate)는 특별 표시 (⚡ 아이콘)

### 4.4 WizardStepDetail.tsx

**Props:**
```typescript
interface WizardStepDetailProps {
  stage: string;          // "2-0" ~ "2-10"
  status: string;         // pending | in_progress | completed | skipped
  discoveryType?: string; // I/M/P/T/S
  bizItemId: string;
  onStatusChange: (stage: string, status: string) => void;
}
```

**각 단계별 콘텐츠 정의** — `STAGE_CONTENT` 상수 맵:

| 단계 | 목적 | 스킬 예시 | 산출물 |
|------|------|-----------|--------|
| 2-0 | AI 3턴 대화로 5유형 분류 | item-classifier | 분류 결과 |
| 2-1 | 레퍼런스 사례 수집·분석 | competitor-analysis | 레퍼런스 보고서 |
| 2-2 | 시장 규모·수요 검증 | market-research | 시장 분석 |
| 2-3 | 경쟁사·자사 역량 비교 | competitor-scanner | 경쟁 분석 |
| 2-4 | 핵심 사업 아이템 도출 | business-plan | 사업 아이템 초안 |
| 2-5 | Commit Gate — Go/Kill 판정 | commit-gate | 의사결정 |
| 2-6 | 타겟 고객 세그먼트 정의 | customer-persona | 페르소나 |
| 2-7 | 비즈니스 모델 설계 | bmc-generator | BMC |
| 2-8 | 패키징 (제안서·Offering Pack) | packaging | 제안서 |
| 2-9 | AI 멀티페르소나 평가 | persona-evaluator | 평가 점수 |
| 2-10 | 최종 보고서 작성 | report-generator | 최종 보고서 |

**상태 변경 버튼:**
- pending → "시작하기" (→ in_progress)
- in_progress → "완료" (→ completed)
- completed → 체크마크 표시

### 4.5 DiscoveryTour.tsx (F265)

**기존 OnboardingTour.tsx 패턴 차용:**
- SVG 마스크 스팟라이트
- 포지셔닝된 툴팁
- localStorage 체크 (`fx-discovery-tour-completed`)

**5스텝 정의:**

| # | target (data-tour) | 제목 | 설명 |
|---|-------------------|------|------|
| 1 | `discovery-wizard` | 🧭 발굴 프로세스 | 사업 아이템별로 2-0~2-10 단계를 순서대로 진행해요 |
| 2 | `discovery-item-select` | 📋 아이템 선택 | 분석할 사업 아이템을 선택하세요. 없으면 새로 등록할 수 있어요 |
| 3 | `discovery-stepper` | 📊 단계 진행 바 | 현재 어디까지 왔는지 한눈에 확인하고, 클릭하면 상세 정보를 볼 수 있어요 |
| 4 | `discovery-step-detail` | 📝 단계 상세 | 각 단계의 목적, 사용할 스킬, 예상 산출물을 확인하고 상태를 변경하세요 |
| 5 | `discovery-items-list` | 📌 아이템 현황 | 전체 사업 아이템의 진행 상태와 신호등을 한눈에 확인하세요 |

**자동 실행 조건:** Discovery 페이지 첫 방문 시 (localStorage 체크)

### 4.6 discovery.tsx 페이지 재구성

기존 `routes/ax-bd/discovery.tsx`를 리팩토링:

```tsx
export function Component() {
  const tourCompleted = localStorage.getItem("fx-discovery-tour-completed");

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <DiscoveryWizard />           {/* F263 */}
      {!tourCompleted && <DiscoveryTour />}  {/* F265 */}
    </div>
  );
}
```

기존 ProcessFlowV82, TypeRoutingMatrix, 아이템 리스트는 DiscoveryWizard 내부에 통합.

---

## 5. 파일 매핑 (구현 대상)

### API 패키지 (packages/api/)

| # | 파일 | 작업 |
|---|------|------|
| 1 | `src/db/migrations/0077_biz_item_discovery_stages.sql` | 신규 — 테이블 생성 |
| 2 | `src/schemas/discovery-stage.ts` | 신규 — Zod 스키마 |
| 3 | `src/services/discovery-stage-service.ts` | 신규 — getProgress, updateStage, initStages |
| 4 | `src/routes/discovery-stages.ts` | 신규 — GET progress + POST stage |
| 5 | `src/routes/biz-items.ts` | 수정 — discovery-stages 라우트 마운트 |

### Web 패키지 (packages/web/)

| # | 파일 | 작업 |
|---|------|------|
| 6 | `src/components/feature/discovery/DiscoveryWizard.tsx` | 신규 — 메인 위저드 |
| 7 | `src/components/feature/discovery/WizardStepper.tsx` | 신규 — 스텝퍼 바 |
| 8 | `src/components/feature/discovery/WizardStepDetail.tsx` | 신규 — 단계 상세 패널 |
| 9 | `src/components/feature/discovery/DiscoveryTour.tsx` | 신규 — 온보딩 투어 |
| 10 | `src/routes/ax-bd/discovery.tsx` | 수정 — 위저드 중심 재구성 |
| 11 | `src/lib/api-client.ts` | 수정 — discovery-progress API 함수 추가 |

### 테스트

| # | 파일 | 작업 |
|---|------|------|
| 12 | `packages/api/src/__tests__/discovery-stages.test.ts` | 신규 — API 테스트 |
| 13 | `packages/web/src/__tests__/DiscoveryWizard.test.tsx` | 신규 — 위저드 테스트 |
| 14 | `packages/web/src/__tests__/DiscoveryTour.test.tsx` | 신규 — 투어 테스트 |

---

## 6. 테스트 전략

### API 테스트 (`discovery-stages.test.ts`)
- `GET /biz-items/:id/discovery-progress` — 초기화 + 전 단계 반환
- `POST /biz-items/:id/discovery-stage` — 상태 변경 + 유효성 검증
- 존재하지 않는 biz-item → 404
- 잘못된 stage/status → 400

### Web 테스트
- DiscoveryWizard: 아이템 선택 → 스텝퍼 표시 → 단계 클릭 → 상세 패널
- WizardStepper: 단계별 상태 색상 + 클릭 이벤트
- DiscoveryTour: localStorage 체크 → 스텝 진행 → 완료 저장

---

## 7. 의존성 확인

| 의존 | 상태 | 비고 |
|------|------|------|
| ProcessFlowV82.tsx | ✅ | 재사용 (위저드 상단에 배치) |
| TypeRoutingMatrix.tsx | ✅ | 재사용 (위저드 내 접이식) |
| analysis-path-v82.ts | ✅ | 스킬/강도 매핑 데이터 |
| OnboardingTour.tsx | ✅ | 패턴 차용 (별도 컴포넌트) |
| api-client.ts | ✅ | fetchApi/postApi 인프라 |
