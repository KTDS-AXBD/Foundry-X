---
id: FX-DSGN-331
sprint: 331
feature: F584
req: FX-REQ-651
status: approved
date: 2026-05-04
---

# Sprint 331 Design — F584: services/model-router 자질구레 cleanup

## §1 목표

`packages/api/src/services/model-router.ts` 1 file을 `packages/api/src/core/agent/services/model-router.ts`로 이동.
F579/F581/F583 14회차 정착화된 `core/agent/services/` 패턴 적용. services/ 루트 파일 해소.

## §2 변경 범위 요약

| 구분 | 파일 수 | 작업 |
|------|--------|------|
| git mv | 1 | model-router.ts 이동 |
| 내부 path 갱신 | 1 | model-router.ts 자체 import |
| 외부 callers 갱신 | 4 | import path 치환 |
| **합계** | **5** | |

## §3 설계 결정

**옵션 A 채택**: `git mv` + 4 callers path 치환.

- F579/F581/F583 14회차 정착화 패턴 — autopilot 자동 채택 가능성 高
- MSA `core/{domain}/` 룰 부분 복원 (services/ 루트 회피)
- DIFF=NONE (fx-agent 측 동명 파일과 핵심 로직 100% 동일, import path 1줄만 차이)
- 옵션 B(fx-agent SSOT로 대체)는 cross-package import 정책 risk → 별건

## §4 API/DB 변경 없음

D1 migration 없음. API 시그니처 변경 없음. 순수 파일 이동 + import path 치환.

## §5 파일 매핑 (Worker File Map)

### 이동 대상

| 원본 | 대상 | 작업 |
|------|------|------|
| `packages/api/src/services/model-router.ts` | `packages/api/src/core/agent/services/model-router.ts` | `git mv` |

### model-router.ts 내부 수정

파일: `packages/api/src/core/agent/services/model-router.ts` (이동 후)

```typescript
// 변경 전 (src/services/ 위치 기준)
import type { AgentTaskType, AgentRunnerType } from "../core/agent/services/execution-types.js";

// 변경 후 (src/core/agent/services/ 위치 기준 — 같은 디렉토리)
import type { AgentTaskType, AgentRunnerType } from "./execution-types.js";
```

### 4 callers import path 갱신

| 파일 | 변경 전 | 변경 후 |
|------|--------|--------|
| `packages/api/src/core/shaping/services/bmc-agent.ts` | `"../../../services/model-router.js"` | `"../../agent/services/model-router.js"` |
| `packages/api/src/core/shaping/services/bmc-insight-service.ts` | `"../../../services/model-router.js"` | `"../../agent/services/model-router.js"` |
| `packages/api/src/core/agent/services/agent-runner.ts` | `"../../../services/model-router.js"` | `"./model-router.js"` |
| `packages/api/src/core/collection/services/insight-agent-service.ts` | `"../../../services/model-router.js"` | `"../../agent/services/model-router.js"` |

## §6 TDD 적용 여부

- **면제**: 파일 이동 + import path 치환. 로직 변경 없음. typecheck + 기존 tests 회귀 확인으로 대체.

## §7 OBSERVED 검증 (P-a ~ P-h)

Plan §3 OBSERVED 8항 그대로 적용. 특히:
- **P-a + P-b 동시 충족** 필수 (단순 삭제 함정 차단)
- **P-c = 0** 필수 (4 callers 모두 갱신)
- **P-e dual_ai_reviews** 자동 INSERT (C103+C104 회귀 차단)
