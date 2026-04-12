# Sprint 265 Plan

> **Summary**: F514 Work Management 대시보드 확장 — B-4 Pipeline Flow + B-5 Velocity/Phase Progress 차트 + E2E
>
> **Project**: Foundry-X
> **Author**: Sinclair Seo + Claude
> **Date**: 2026-04-12
> **Status**: In Progress
> **F-items**: F514
> **REQs**: FX-REQ-537

---

## 1. Sprint Scope

### 1.1 F514 — Work Management 대시보드 확장 (B-4, B-5)

F513 API(velocity/phase-progress/backlog-health) 완성 위에 웹 UI 추가.

| Task | 내용 | 결과물 | 종류 |
|------|------|--------|------|
| B-4 | Pipeline Flow 탭 — snapshot + backlog-health 기반 Idea→Done 단계별 F-item 수 시각화 | PipelineFlowTab 컴포넌트 | code |
| B-5 | Velocity 탭 — GET /api/work/velocity 기반 Sprint별 도입률 바 차트 | VelocityTab 컴포넌트 | code |
| B-5 | Phase Progress 탭 — GET /api/work/phase-progress 기반 Phase 완료율 바 | PhaseProgressTab 포함(VelocityTab 내) | code |
| B-5 | Backlog Health 탭 — GET /api/work/backlog-health 기반 건강도 + 경고 | BacklogHealthTab 컴포넌트 | code |
| E2E | 3개 신규 탭 mock-based E2E 테스트 (CI-safe) | work-management.spec.ts 확장 | code |

**목표**: 웹 대시보드 탭 수 4 → 7 (KPI 달성)

---

## 2. Dependencies

- F513 API 완료 ✅ (Sprint 264 PR #518 merged)
  - GET /api/work/velocity ✅
  - GET /api/work/phase-progress ✅
  - GET /api/work/backlog-health ✅
- 기존 work-management.tsx 4탭 구조 위에 확장
- Playwright E2E 인프라 기존 fixtures 재사용

---

## 3. Git Strategy

| Task | 변경 종류 | Git 경로 |
|------|----------|---------|
| F514 UI + E2E | code | PR + auto-merge (sprint/265 브랜치) |
| Plan/Design docs | meta (혼합) | code PR에 함께 포함 |

---

## 4. Acceptance Criteria

- 웹 대시보드 탭 7개 (kanban/context/classify/sessions/pipeline/velocity/backlog)
- PipelineFlowTab: snapshot summary + backlog-health 데이터 시각화
- VelocityTab: Sprint별 도입 건수 바 차트 + trend badge + avg 표시
- BacklogHealthTab: health_score + stale_items 목록 + warnings
- E2E: pipeline/velocity/backlog 각 탭 전환 + 데이터 검증 3건
- typecheck PASS

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-04-12 | Sprint 265 착수 — F514 B-4 + B-5 |
