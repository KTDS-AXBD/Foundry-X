---
code: FX-ANLS-001
title: Foundry-X CLI Gap Analysis (Final)
version: 2.0
status: Active
category: ANLS
created: 2026-03-16
updated: 2026-03-16
author: Sinclair Seo
---

# foundry-x-cli Gap Analysis

> **Match Rate: 93%** — Sprint 1 + Sprint 2 완료. 잔여 gap: Ink TUI 컴포넌트 3개 (Medium)

## Match Rate History

| Round | Date | Rate | Iteration | Key Changes |
|-------|------|:----:|:---------:|-------------|
| 1차 | 2026-03-16 | 46% | — | Sprint 1 핵심 모듈 구현 |
| 2차 | 2026-03-16 | 55% | Act-1 | G1~G4 해결 (shared 통합, 변수 치환, vitest) |
| **3차** | **2026-03-16** | **93%** | **Sprint 2** | **commands, templates, scripts, CI, 테스트 35개** |

## Category Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| File Structure (S10) | 85% | OK (ui/*.tsx 3개 미구현) |
| Data Model (S3) | 95% | OK |
| Harness Pipeline (S4) | 95% | OK |
| CLI Commands (S5) | 95% | OK |
| PlumbBridge (S6) | 95% | OK |
| Template System (S7) | 100% | OK |
| Verification Scripts (S8) | 100% | OK |
| Test Plan (S9) | 85% | OK (integration test 미작성) |

## Resolved Gaps

| Gap | Resolution | Round |
|-----|-----------|:-----:|
| G1: cli/harness/types.ts drift | shared 통합 + IntegrityLevel 추가 | Act-1 |
| G2: packageManager 누락 | discover.ts 수정 | Act-1 |
| G3: generate.ts 변수 치환 | applyProfileVariables() 구현 | Act-1 |
| G4: vitest + 단위 테스트 | 3파일 12케이스 | Act-1 |
| G5: commands/ 분리 | init/sync/status.ts 구현 | Sprint 2 |
| G6: templates/default/ | 8파일 전부 생성 | Sprint 2 |
| G7: templates/kt-ds-sr/ + lint/ | 4+3파일 생성 | Sprint 2 |
| G9: harness-verifier.ts | 서비스 래퍼 구현 | Sprint 2 |
| G10: scripts/*.sh | verify-harness + check-sync | Sprint 2 |
| G11: CI workflow | harness-sync-check.yml | Sprint 2 |
| G12: 테스트 확장 | 5파일 23케이스 추가 (총 35) | Sprint 2 |
| G13: PlumbBridge 테스트 | bridge.test.ts 7케이스 | Sprint 2 |

## Remaining Gaps (Low Priority)

| Gap | Severity | Impact | Decision |
|-----|:--------:|--------|----------|
| ui/init-report.tsx | Medium | UX only | console 출력으로 대체, Phase 2에서 Ink TUI 도입 |
| ui/sync-report.tsx | Medium | UX only | 동일 |
| ui/status-display.tsx | Medium | UX only | 동일 |
| Integration test (e2e) | Medium | 검증 | 단위 테스트 35개로 커버, e2e는 온보딩 시 수동 검증 |

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript build | ✅ 0 errors |
| TypeScript typecheck | ✅ 0 errors |
| Vitest | ✅ 35/35 passed (8 test files) |
| Template completeness | ✅ 15/15 files |
| Script executable | ✅ 2/2 |
