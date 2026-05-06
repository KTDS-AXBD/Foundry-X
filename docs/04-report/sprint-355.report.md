---
code: FX-RPRT-355
title: Sprint 355 — F631 자동화 정책 코드 강제 완료 보고서
version: 1.0
status: Completed
category: REPORT
created: 2026-05-06
sprint: 355
f_item: F631
req: FX-REQ-696
match_rate: 100%
---

# Sprint 355 — F631 자동화 정책 코드 강제 완료 보고서

## §1 요약

| 항목 | 결과 |
|------|------|
| F-item | F631 AI Foundry BeSir 흡수 4 · 분석X 자동화O 정책 코드 강제 |
| Match Rate | **100%** (gap-detector 8/8 PASS) |
| TDD | Red→Green 4 tests (T1~T4) |
| typecheck | 회귀 0 (F631 파일 오류 없음) |
| Codex verdict | BLOCK (false positive — FX-REQ-587~590 잘못된 PRD 컨텍스트, F631은 FX-REQ-696) |

## §2 구현 산출물

| 파일 | 분류 | 내용 |
|------|------|------|
| `packages/api/src/db/migrations/0143_automation_policy.sql` | 신규 | 2 테이블 + 2 인덱스 + append-only trigger |
| `packages/api/src/core/policy/types.ts` | 신규 | AutomationActionType(5종) + PolicyEvaluation + PolicyViolation |
| `packages/api/src/core/policy/schemas/policy.ts` | 신규 | 4 Zod 스키마 (ActionType + Register + Evaluate + Response) |
| `packages/api/src/core/policy/services/policy-engine.service.ts` | 신규 | PolicyEngine: evaluate + registerPolicy |
| `packages/api/src/core/policy/routes/index.ts` | 신규 | Hono sub-app: POST /evaluate + POST /register |
| `packages/api/src/core/policy/policy-engine.test.ts` | 신규 | TDD 4 cases |
| `packages/api/src/app.ts` | 수정 | import + app.route("/api/policy", policyApp) |
| `docs/02-design/features/sprint-355.design.md` | 신규 | Design 문서 |

## §3 핵심 설계 결정

### whitelist + default-deny 패턴
- `automation_policies` 테이블에 정책 없으면 **자동 거부** (default-deny)
- `allowed = 1` 명시 등록 시만 허용 (whitelist)
- `UNIQUE(org_id, action_type)` 제약으로 org별 단일 정책 보장

### audit-bus 통합 (F606)
- `policy.evaluated` — 모든 평가 시 발행 (allowed/denied 모두)
- `policy.violation` — default-deny 또는 denied 시 추가 발행
- `policy_violations` 테이블에 위반 이력 append-only 보관 (UPDATE trigger로 강제)

### F615 Guard-X와 책임 분리
- F631 = 정책 **정의** + 화이트리스트 (provider)
- F615 = 정책 **평가** 엔진 + ULID+HMAC (consumer)

## §4 Phase Exit P-a~P-l 현황

| ID | 항목 | 판정 | 비고 |
|----|------|:----:|------|
| P-a | D1 migration 0143 적용 + 2 테이블 | 수동 필요 | production push 후 확인 |
| P-b | core/policy/ 5+ files | ✅ | 6 files |
| P-c | types.ts 3 export | ✅ | 4 export |
| P-d | schemas/policy.ts 3 schema | ✅ | 4 schema |
| P-e | PolicyEngine class | ✅ | evaluate + registerPolicy |
| P-f | 2 endpoints | ✅ | /evaluate + /register |
| P-g | 2 audit 이벤트 | ✅ | policy.evaluated + policy.violation |
| P-h | app.ts mount | ✅ | /api/policy |
| P-i | typecheck + tests GREEN | ✅ | 4/4 GREEN |
| P-j | dual_ai_reviews 자동 INSERT | 수동 필요 | BLOCK verdict 저장 완료 |
| P-k | baseline=0 회귀 | 수동 필요 | scripts/lint-baseline-check.sh |
| P-l | API smoke 2 case | 수동 필요 | production merge 후 |

## §5 Codex Review 기록

- verdict: BLOCK, degraded: false
- 원인: FX-REQ-587~590 잘못된 PRD context (F631은 FX-REQ-696)
- prd_coverage.covered: [] (빈 배열 — context 실패 신호)
- 처리: false positive로 판단, dual_ai_reviews 저장 후 Gap 100% + TDD 기준으로 진행
- 향후: Codex review 스크립트의 sprint→PRD 매핑 개선 필요 (FX-REQ-696 컨텍스트 주입)

## §6 교훈

- PolicyEngine의 `Pick<AuditBus, "emit">` 타입 사용 → 테스트 시 간단한 vi.fn() mock 주입 가능
- D1 mock 패턴 (audit-bus.test.ts 재현): `prepare().bind().first() / .run()` 체인 구조
- 5-Asset Model 첫 번째 자산 'Policy' — T2 두 번째 sprint로 core/policy/ 도메인 확립
