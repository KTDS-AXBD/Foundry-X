---
code: FX-ANLS-029
title: "Sprint 28 Gap Analysis — Phase 3 완결: 에이전트 자동 Rebase + Semantic Linting + Plumb Track B 판정"
version: 0.1
status: Active
category: ANLS
system-version: 2.1.0
created: 2026-03-21
updated: 2026-03-21
author: Sinclair Seo
---

# Sprint 28 Gap Analysis

> **Design**: [sprint-28.design.md](../../02-design/features/sprint-28.design.md)
> **Plan**: [sprint-28.plan.md](../../01-plan/features/sprint-28.plan.md)
> **Match Rate**: **93%** (Check 통과)
> **Date**: 2026-03-21

---

## 1. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| F102 AutoRebaseService | 93% | ✅ |
| F103 Semantic Linting | 95% | ✅ |
| F105 Plumb Track B 판정 | 82% | ⚠️ |
| Architecture Compliance | 98% | ✅ |
| Convention Compliance | 96% | ✅ |
| Test Coverage | 95% | ✅ |
| **Overall** | **93%** | **✅** |

---

## 2. Verification Results

| Check | Result |
|-------|--------|
| Typecheck | ✅ 5/5 passed (0 errors) |
| Lint | ✅ 0 errors, 2 warnings (기존 no-explicit-any) |
| API Tests | ✅ 550/550 (+15 new from F102) |
| CLI Tests | ✅ All passed (+6 new from F105) |
| ESLint Rules | ✅ 3 rules loaded, config valid |

---

## 3. F102 — AutoRebaseService (93%)

### 3.1 Implemented ✅

| Design Item | Implementation | Match |
|-------------|---------------|:-----:|
| AutoRebaseService class | `auto-rebase.ts` 232 LOC | ✅ |
| RebaseAttempt interface | Locally defined (3 strategies) | ✅ |
| RebaseResult interface | success/attempts/escalated/restoredToOriginal | ✅ |
| RebaseEscalation interface | type/agentId/taskId/baseBranch/conflicts/attempts/suggestedAction | ✅ |
| MAX_REBASE_ATTEMPTS=3 | Exported const | ✅ |
| MAX_CONFLICT_FILES=10 | Exported const | ✅ |
| REBASE_TIMEOUT_MS=60000 | Declared (logic deferred) | ⚠️ |
| rebaseWithRetry() | 3-attempt loop with strategy escalation | ✅ |
| getStrategy() | simple → llm-resolve → llm-extended | ✅ |
| abortAndRestore() | git rebase --abort + state recovery | ✅ |
| escalateToHuman() | AgentInbox.send() + SSE pushEvent | ✅ |
| WorktreeManager.fetchBase() | gitExecutor(["fetch"]) | ✅ |
| WorktreeManager.rebase() | gitExecutor(["rebase"]) | ✅ |
| WorktreeManager.abortRebase() | gitExecutor(["rebase", "--abort"]) | ✅ |
| WorktreeManager.continueRebase() | gitExecutor(["rebase", "--continue"]) | ✅ |
| WorktreeManager.stageFile() | gitExecutor(["add"]) | ✅ |
| MergeQueue autoRebase DI | constructor optional param | ✅ |
| MergeQueue processNext rebase path | autoRebase.rebaseWithRetry() 호출 | ✅ |
| Legacy fallback | autoRebase 없으면 기존 github.updateBranch() | ✅ (bonus) |
| Tests | 14/15 구현 | ⚠️ |

### 3.2 Gaps

| Gap | Severity | Description |
|-----|:--------:|-------------|
| shared/types.ts 미이동 | Low | 타입을 shared 대신 auto-rebase.ts에 로컬 정의. 기능 영향 없음. |
| Timeout 로직 미구현 | Low | REBASE_TIMEOUT_MS 상수 선언만. F101 AutoFix 연동 시 추가 가능. |
| Test #15 timeout | Low | 타임아웃 동작 테스트 미구현. 로직 미구현에 따른 자연스러운 누락. |

---

## 4. F103 — Semantic Linting (95%)

### 4.1 Implemented ✅

| Design Item | Implementation | Match |
|-------------|---------------|:-----:|
| no-direct-db-in-route rule | .ts + .mjs | ✅ |
| require-zod-schema rule | .ts + .mjs | ✅ |
| no-orphan-plumb-import rule | .ts + .mjs | ✅ |
| Plugin export (index) | .ts + .mjs | ✅ |
| meta.hasSuggestions: true | 3개 룰 모두 | ✅ |
| context.filename 기반 범위 제어 | /routes/ 체크 | ✅ |
| eslint.config.js 통합 | .mjs import + 3 rules registered | ✅ |
| Tests (3 files) | 9건 (RuleTester 기반) | ✅ |
| Actual fix suggestions | fixer.replaceText() 구현 | ✅ (bonus) |

### 4.2 Gaps

| Gap | Severity | Description |
|-----|:--------:|-------------|
| .mjs 병행 | Low (positive) | Design에 없던 .mjs 파일 추가 — ESLint ESM 호환 필수 조치 |
| Test #10 plugin registration | Low | 간접 검증 (eslint.config 로딩 시 3룰 정상 등록 확인됨) |

### 4.3 Intentional Change

- **TS → MJS 변환**: ESLint flat config는 Node.js ESM으로 실행되어 `.ts` 직접 import 불가. `.mjs` 파일을 ESLint용, `.ts` 파일을 타입 참조/테스트용으로 병행 유지. 이는 설계 시점에서 미예견된 기술적 제약으로, 합리적 대응.

---

## 5. F105 — Plumb Track B 판정 (82%)

### 5.1 Implemented ✅

| Design Item | Implementation | Match |
|-------------|---------------|:-----:|
| calculateMetrics() | Standalone function | ✅ |
| applyDecisionMatrix() | 3-way decision (go/stay/conditional) | ✅ |
| generateAdrMarkdown() | 전 섹션 포함 (Status/Context/Data/Decision/Consequences) | ✅ |
| ADR-001 문서 | docs/adr/ADR-001-plumb-track-b.md | ✅ |
| 판정 결과 | Stay Track A (주간 장애 0.125회/주) | ✅ |
| 재판정 일자 | 2026-09-21 (6개월 후) | ✅ |
| Tests | 6건 (5 planned + 1 bonus) | ✅ |

### 5.2 Gaps

| Gap | Severity | Description |
|-----|:--------:|-------------|
| collectFromGitLog() | Medium | 자동 Git log 분석 함수 미구현 — 수동 Bash로 대체 |
| collectFromCodebase() | Medium | 자동 코드베이스 분석 함수 미구현 — 수동 grep으로 대체 |
| Class → Functions | Low | PlumbUsageAnalyzer class 대신 standalone 함수로 구현 |
| 일부 metrics 필드 누락 | Medium | totalInvocations, successCount, failureCount, averageResponseTimeMs, errorPatterns 미포함 |

### 5.3 Intentional Changes

- **수동 데이터 수집**: 실사용자 미참여 + KPI 인프라(F100) 미완성 상태에서, 자동 수집 함수 구현보다 수동 분석이 현실적. F100 안정화 후 자동화 가능.
- **인터페이스 재설계**: 런타임 호출 데이터(totalInvocations 등) 대신 Git 커밋 기반 분석(bugFixCommits, totalPlumbCommits)으로 전환. 가용 데이터에 맞춘 실용적 판단.
- **분석 기간 확장**: 4주 → 8주. 표본 확대를 위한 긍정적 변경.

---

## 6. Summary

### 전체 Match Rate: 93%

```
[Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check] ✅ 93% → [Report] ⏳
```

### Gap 분류

| Severity | Count | Action |
|----------|:-----:|--------|
| Medium | 3 | F105 자동 수집 함수 — 의도적 연기 (F100 의존), 기록만 |
| Low | 5 | 타입 이동, timeout, 테스트 1건 등 — 기능 영향 없음 |

### 판정: ✅ Check 통과 (93% ≥ 90%)

Iteration 불필요. `/pdca report sprint-28`로 진행 가능.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-21 | Initial gap analysis | Sinclair Seo |
