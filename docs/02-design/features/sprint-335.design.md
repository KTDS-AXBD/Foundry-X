---
id: FX-DESIGN-335
sprint: 335
feature: F589
req: FX-REQ-656
status: approved
date: 2026-05-04
---

# Sprint 335 Design — F589: worktree-manager 도메인 분리

## §1 목표

`packages/api/src/services/worktree-manager.ts` → `packages/api/src/core/harness/services/worktree-manager.ts` 이동 (옵션 A 15회차).

services/ 루트 직속 `.ts` 파일 수: 27 → 26 (-1).

## §2 변경 파일 매핑

### 이동 (git mv)

| 원본 | 대상 |
|------|------|
| `packages/api/src/services/worktree-manager.ts` | `packages/api/src/core/harness/services/worktree-manager.ts` |
| `packages/api/src/__tests__/worktree-manager.test.ts` | `packages/api/src/__tests__/services/worktree-manager.test.ts` (또는 import만 갱신) |

### import path 갱신 (callers 4건)

| 파일 | 현재 import | 신규 import |
|------|-------------|-------------|
| `packages/api/src/core/agent/services/agent-orchestrator.ts:11` | `"../../../services/worktree-manager.js"` | `"../../harness/services/worktree-manager.js"` |
| `packages/api/src/core/harness/services/auto-rebase.ts:1` | `"../../../services/worktree-manager.js"` | `"./worktree-manager.js"` |
| `packages/api/src/__tests__/worktree-manager.test.ts:2` | `"../services/worktree-manager.js"` | `"../core/harness/services/worktree-manager.js"` (또는 이동 후 상대경로) |
| `packages/api/src/__tests__/services/auto-rebase.test.ts:3` | `"../../services/worktree-manager.js"` | `"../../core/harness/services/worktree-manager.js"` |

### dist orphan cleanup

| 파일 | 처리 |
|------|------|
| `packages/api/dist/services/worktree-manager.js` | `git rm` |
| `packages/api/dist/services/worktree-manager.js.map` | `git rm` |
| `packages/api/dist/services/worktree-manager.d.ts` | `git rm` |
| `packages/api/dist/services/worktree-manager.d.ts.map` | `git rm` |

## §3 MSA 도메인 배치

- `core/harness/services/` — git worktree/작업환경 관리 유틸리티 (auto-fix, auto-rebase sibling)
- `core/agent/services/agent-orchestrator.ts` → `core/harness/services/worktree-manager.ts` cross-domain type-only import: CLAUDE.md MSA 룰 "상대방 도메인의 contract 파일" 예외 적용

## §4 TDD 체크

- 면제 조건: 파일 이동 + import path 치환 (신규 로직 0건)
- auto-rebase.test.ts runtime 6건 GREEN 유지가 핵심 검증

## §5 OBSERVED Exit Criteria

P-a services/ worktree-manager* = 0, P-b core/harness/services/worktree-manager* = 1, P-c services/ 루트 26, P-d OLD import 0건, P-e typecheck+test GREEN, P-f dual_ai_reviews INSERT ≥ 1건(누적 ≥ 23), P-g hook 로그 생성, P-h-1~8 회귀 0건, P-i Match ≥ 90%, P-j dist orphan 0건.
