# Sprint 265 Design

> **Summary**: F514 Work Management 대시보드 확장 상세 설계
>
> **Project**: Foundry-X
> **Author**: Sinclair Seo + Claude
> **Date**: 2026-04-12
> **Status**: Approved
> **Plan**: `docs/01-plan/features/sprint-265.plan.md`

---

## §1 F514 — 대시보드 확장 컴포넌트 설계

### B-4: PipelineFlowTab

**데이터 소스**: GET /api/work/snapshot (summary) + GET /api/work/backlog-health

**UI 구조**:
```
Pipeline Flow: Idea → Plan → Impl → Done
[■■■■] Backlog  (N items)
[■■■]  Planned  (N items)
[■■]   In Progress (N items)  ← backlog-health health_score로 색상 결정
[■■■■■] Done   (N items)
+ Backlog Health Score: NNN/100
+ stale_items 경고 목록
```

**컴포넌트 시그니처**:
```typescript
function PipelineFlowTab({
  snapshot: WorkSnapshot | null,
  backlogHealth: BacklogHealthData | null
}): JSX.Element
```

**단계 매핑**:
| 화면 레이블 | 데이터 소스 | 색상 |
|-----------|-----------|------|
| Backlog   | snapshot.summary.backlog | #6b7280 |
| Planned   | snapshot.summary.planned | #3b82f6 |
| In Progress | snapshot.summary.in_progress | #f59e0b |
| Done (Today) | snapshot.summary.done_today | #22c55e |

### B-5a: VelocityTab

**데이터 소스**: GET /api/work/velocity

**UI 구조**:
```
Sprint Velocity
Avg: N.N F-items/sprint  [trend badge: ↑UP / ↓DOWN / →stable]

Sprint 261  ■■■■■     3
Sprint 262  ■■■       2
Sprint 264  ■■■■■■■   5
            (CSS width % 기반 바 차트, 최대값 정규화)
```

**컴포넌트 시그니처**:
```typescript
function VelocityTab({
  velocity: VelocityData | null,
  phaseProgress: PhaseProgressData | null
}): JSX.Element
```

### B-5b: BacklogHealthTab (별도 탭)

**데이터 소스**: GET /api/work/backlog-health

**UI 구조**:
```
Backlog Health  [Score: NN/100]
Total: N items

⚠ Warnings:
  - 백로그 항목이 N개로 과다합니다
  - 장기 대기 항목 N개 검토 필요

Stale Items (N개):
  F112  장기 백로그 항목 A  (15 sprints 대기)
```

---

## §2 타입 추가

```typescript
// work-management.tsx 상단에 추가

interface VelocityData {
  sprints: Array<{ sprint: number; f_items_done: number; week: string }>;
  avg_per_sprint: number;
  trend: "up" | "down" | "stable";
  generated_at: string;
}

interface PhaseProgressData {
  phases: Array<{
    id: number; name: string;
    total: number; done: number; in_progress: number; pct: number;
  }>;
  current_phase: number;
  generated_at: string;
}

interface BacklogHealthData {
  total_backlog: number;
  stale_items: Array<{ id: string; title: string; age_sprints: number }>;
  health_score: number;
  warnings: string[];
  generated_at: string;
}
```

---

## §3 테스트 계약 (TDD Red Target)

### E2E Red Target (work-management.spec.ts 추가)

```
F514 Dashboard Extensions (Sprint 265):
  ✓ pipeline tab — renders stage counts (backlog/planned/in_progress/done)
  ✓ pipeline tab — shows backlog health score
  ✓ velocity tab — renders sprint bars and avg
  ✓ velocity tab — shows trend badge
  ✓ backlog tab — shows total count and health score
  총 5건 FAIL → Green 후 PASS
```

E2E 실행: `cd packages/web && pnpm e2e --grep "F514"`

---

## §4 파일 매핑

| 작업 | 파일 | 변경 종류 |
|------|------|---------|
| 타입 추가 + 3 컴포넌트 | `packages/web/src/routes/work-management.tsx` | 수정 |
| fetch 로직 추가 | `packages/web/src/routes/work-management.tsx` | 수정 |
| 탭 타입 확장 | `packages/web/src/routes/work-management.tsx` | 수정 |
| E2E 테스트 추가 | `packages/web/e2e/work-management.spec.ts` | 수정 |
| Plan 문서 | `docs/01-plan/features/sprint-265.plan.md` | 생성 |
| Design 문서 | `docs/02-design/features/sprint-265.design.md` | 생성 |

---

## §5 Gap 판단 기준

| 항목 | 완료 기준 |
|------|----------|
| 탭 수 | 웹 UI에 7개 탭 버튼 존재 |
| PipelineFlowTab | pipeline 탭 클릭 시 Backlog/Planned/In Progress/Done 4단계 표시 |
| VelocityTab | velocity 탭 클릭 시 Sprint 바 차트 + avg + trend 표시 |
| BacklogHealthTab | backlog 탭 클릭 시 health_score + stale_items 표시 |
| E2E | F514 E2E 5건 PASS |
| typecheck | 0 errors |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-04-12 | Sprint 265 Design — F514 B-4 + B-5 상세 설계 |
