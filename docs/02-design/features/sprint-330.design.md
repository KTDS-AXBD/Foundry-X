---
id: FX-DESIGN-330
sprint: 330
feature: F583
req: FX-REQ-650
status: approved
date: 2026-05-04
---

# Sprint 330 Design — F583: services/agent heavy 2 deduplicate → core/agent/services/

## §1 목표

`packages/api/src/services/agent/` 마지막 2 files (heavy 2)를 `packages/api/src/core/agent/services/`로 이동하여 Phase 46 100% literal 종결.

- `agent-runner.ts` (37 callers) — DIFF: 3 import path만
- `execution-types.ts` (30 callers) — DIFF: NONE (완전 동일)

## §2 접근법

**Option C (Plan §2 확정)**: core/agent/services/ 이동 방식 (F581 패턴 연속).
fx-agent 측 SSOT 확증됨 (DIFF 검증 완료). 67 callers 단순 import path 치환만.

TDD: 리팩토링 = 선택. 기존 vitest suite가 회귀 검증 대신.

## §3 파일 매핑

### 신규 생성

| 파일 | 내용 |
|------|------|
| `packages/api/src/core/agent/services/agent-runner.ts` | agent-runner.ts 이동 + import 3건 수정 |
| `packages/api/src/core/agent/services/execution-types.ts` | execution-types.ts 그대로 복사 (DIFF=NONE) |

### agent-runner.ts import 변경 (신규 위치에서)

| 기존 | 변경 후 |
|------|---------|
| `"./execution-types.js"` | `"./execution-types.js"` (유지) |
| `"../../core/agent/services/claude-api-runner.js"` | `"./claude-api-runner.js"` |
| `"../../core/agent/services/openrouter-runner.js"` | `"./openrouter-runner.js"` |
| `"../model-router.js"` | `"../../../services/model-router.js"` |

### 삭제

- `packages/api/src/services/agent/agent-runner.ts`
- `packages/api/src/services/agent/execution-types.ts`
- `packages/api/src/services/agent/` 디렉토리 (git rm)

### Callers 갱신 (67건, 3패턴)

**패턴 A**: `core/agent/services/*.ts` (12파일) — `"../../../services/agent/X"` → `"./X"`

**패턴 B**: `core/agent/services/graphs/*.ts` (1파일: discovery-graph.ts) — `"../../../../services/agent/X"` → `"../X"`

**패턴 C**: `core/*/services/*.ts`, `core/*/routes/*.ts`, `modules/*/services/*.ts` — `"../../../services/agent/X"` → `"../../../core/agent/services/X"`

**패턴 D**: `__tests__/*.ts`, `services/*.ts` (root) — `"../services/agent/X"` → `"../core/agent/services/X"`

## §4 검증

```bash
# P-a: services/agent 0건
find packages/api/src/services/agent -type f -name "*.ts" | wc -l  # = 0

# P-c: 외부 callers 잔존 import 0건
grep -rEn "from .*services/agent/(agent-runner|execution-types)" packages/ | grep -v "packages/fx-agent" | wc -l  # = 0

# P-j: fx-agent self-contained
grep -rEn "from .*core/agent/services" packages/fx-agent/src/ | wc -l  # = 0

# typecheck + test
turbo typecheck && turbo test
```

## §5 위험

- **W1**: agent-runner가 `ModelRouter`를 `../model-router.js` (services/agent/→services/)로 import — 신규 위치에서는 `../../../services/model-router.js`로 변경 필수
- **W2**: 패턴 A와 C가 동일 문자열 `"../../../services/agent/"` 사용 → 파일별 sed 필요
