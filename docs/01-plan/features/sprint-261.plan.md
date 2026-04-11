---
id: FX-PLAN-261
title: Sprint 261 — F509 fx-work-observability Walking Skeleton
sprint: 261
status: APPROVED
created: 2026-04-12
---

# Sprint 261 Plan — F509 fx-work-observability

## 목표

Walking Skeleton 4개 기능(M1~M4) 구현으로 "작업 관찰성 부재" 문제를 해결한다.
End-to-end 시나리오 S1 완주 + 사용자 "보인다" 인지 경험.

## 범위

| # | 기능 | 파일 |
|---|------|------|
| M1 | Backlog Aggregator | `packages/api/src/routes/work.ts`, `services/work.service.ts`, `schemas/work.ts` |
| M2 | Static Kanban Web UI | `packages/web/src/routes/work-management.tsx` |
| M3 | Context Resume 섹션 | work-management.tsx 내 Context tab |
| M4 | NL→REQ 분류기 | `POST /api/work/classify` + work-management.tsx Classify tab |

## 핵심 결정

- **GitHub API 우선**: CF Workers는 로컬 파일 접근 불가 → SPEC.md/git log/PR list를 GitHub API로 대체
- **LLM→regex fallback**: ANTHROPIC_API_KEY 없거나 에러 시 regex fallback 자동 적용
- **auth 없음**: work 엔드포인트는 read-only + 혼자 모드 → 인증 미들웨어 생략
- **D1 migration 없음**: Walking Skeleton은 상태 캐싱 없이 매 요청 GitHub API live fetch

## Out of Scope

- 편집 UI / RBAC
- /tmp/task-signals 파일 (로컬 전용, Workers에서 불가)
- Should Have 항목 (M1.a burndown, M2.a drag-drop 등)

## 성공 기준

- [ ] GET /api/work/snapshot → JSON 200
- [ ] GET /api/work/context → JSON 200
- [ ] POST /api/work/classify → {track, priority, title}
- [ ] /work-management 4컬럼 Kanban 렌더
- [ ] typecheck pass
