# fx-tdd-workflow Gap Analysis

> **Date**: 2026-04-12 | **Analyst**: gap-detector | **Match Rate**: V-97

## Design Document

`docs/specs/fx-tdd-workflow/prd-final.md` (945줄, 3-AI 검토 반영)

## Implementation Files

- `.claude/rules/tdd-workflow.md` (65줄, 신규)
- `.claude/rules/testing.md` (31줄, 수정)
- `.claude/rules/sdd-triangle.md` (26줄, 수정)

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| 작업A: tdd-workflow.md | 92% | PASS |
| 작업B: testing.md | 97% | PASS |
| 작업C: sdd-triangle.md | 100% | PASS |
| §14 보완 사항 반영 | 90% | PASS |
| **Overall Match Rate** | **V-97** | **PASS** |

## V-NN Items

| # | 항목 | Design | Impl | 상태 |
|---|------|--------|------|------|
| V1 | Red Phase 규칙 (9항목) | §3 작업A | tdd-workflow.md | 완전 일치 |
| V2 | Green Phase 규칙 (5항목) | §3 작업A | tdd-workflow.md | 완전 일치 |
| V3 | 적용 범위 4등급 | §3 작업A | tdd-workflow.md | 의도적 변경 (§14 반영) |
| V4 | Git Workflow 연동 | §3 작업A | tdd-workflow.md | 완전 일치 |
| V5 | E2E Red Phase 특칙 | §14-1 | tdd-workflow.md | 완전 일치 |
| V6 | 예외 정책 | §14-4 | tdd-workflow.md | 완전 일치 |
| V7 | SSOT 선언 | §14-5 | tdd-workflow.md + testing.md | 완전 일치 |
| V8 | testing.md TDD 섹션 | §3 작업B | testing.md | 의도적 변경 (§14 반영) |
| V9 | sdd-triangle.md TDD 순서 | §3 작업C | sdd-triangle.md | 완전 일치 |
| V10 | Refactor Phase | §2 다이어그램 | **미반영** | 누락 (LOW, 선택 항목) |

## 의도적 변경 (6건, 전부 §14 보완 반영)

| # | PRD 원문 | 최종 구현 | 사유 |
|---|---------|----------|------|
| C1 | E2E: 필수 | E2E: 권장 | §14-1 Red Phase 한계 반영 |
| C2 | D1 migration: 선택 | D1 migration: 면제 | §14-4 + §6 통합 |
| C3 | testing.md "필수 적용" | "적용" | E2E 하향과 일관성 |
| C4 | testing.md (SSOT) 없음 | (SSOT) 추가 | §14-5 반영 |
| C5 | 면제: shared, meta, docs | + P0 Hotfix, 1-line | §14-4 예외 정책 통합 |
| C6 | §14-2,3 자동화/KPI | 규칙 파일 미반영 | 운영 정책, 규칙 파일 범위 밖 (EXPECTED) |

## 누락 (1건)

| # | 항목 | 영향도 | 조치 |
|---|------|:------:|------|
| M1 | Refactor Phase "(선택)" | LOW | 1줄 추가 권장 (필수 아님) |

## 판정

**V-97 PASS** — 39항목 중 38 PASS + 6건 의도적 변경. 누락 1건(Refactor)은 선택 항목.
90% 이상이므로 완료 보고서 작성 가능.
