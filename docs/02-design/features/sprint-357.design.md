---
code: FX-DESIGN-357
title: Sprint 357 Design — F602 4대 진단 PoC
version: 1.0
status: Active
category: DESIGN
created: 2026-05-06
updated: 2026-05-06
sprint: 357
f_item: F602
req: FX-REQ-666
---

# Sprint 357 Design — F602 4대 진단 PoC

> Plan: `docs/01-plan/features/sprint-357.plan.md` (권위 소스)

## §1 기술 결정

| 결정 | 선택 | 근거 |
|------|------|------|
| sub-app 타입 | plain `Hono` (policy 패턴) | OpenAPIHono는 route 타입 명세 필요 — 단순 PoC엔 과잉 |
| AuditBus 주입 | `emit(eventType, payload, ctx)` + TraceContext 직접 생성 | F606 표준. `generateTraceId + generateSpanId` 사용 |
| test 위치 | `core/diagnostic/diagnostic-engine.test.ts` | 기존 policy/infra 패턴 일치 |
| D1 findAll pattern | `.all<RowType>()` + `?.results ?? []` | F606/F631 패턴 |

## §2 파일 매핑 (Plan §3 기준)

| 파일 | 작업 | 의존 |
|------|------|------|
| `db/migrations/0144_diagnostic_findings.sql` | 신규 | — |
| `core/diagnostic/types.ts` | 신규 | — |
| `core/diagnostic/schemas/diagnostic.ts` | 신규 | types.ts |
| `core/diagnostic/services/diagnostic-engine.service.ts` | 신규 | infra/types.js (AuditBus) |
| `core/diagnostic/diagnostic-engine.test.ts` | 신규 (TDD Red/Green) | service |
| `core/diagnostic/routes/index.ts` | 신규 | service + schemas |
| `app.ts` | 수정 (+2 lines) | routes/index.ts |

## §3 테스트 계약 (TDD Red Target)

| # | 테스트 | 입력 | 기대 출력 |
|---|--------|------|-----------|
| T1 | runMissing | seed entity (besir_type NULL) | findings.length === 1 |
| T2 | runDuplicate | seed 2 entities (동일 entity_type+external_id) | findings.length === 1 |
| T3 | runOverspec | seed 1 orphan entity (entity_links 없음) | findings.length === 1 |
| T4 | runInconsistency | seed 2 entities (동일 external_id, 다른 title) | findings.length === 1 |

## §4 MSA 룰 준수

- `core/diagnostic/` 신규 도메인 — 다른 domain internal import 없음
- types.ts의 `DiagnosticEngine` re-export로 cross-domain 참조 허용
- `/api/diagnostic` sub-app mount (app.ts)

## §5 Phase Exit 체크리스트 (P-a~P-l)

Plan §4 참조. P-i typecheck + 4 tests GREEN 기준.
