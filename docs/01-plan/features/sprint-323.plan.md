---
id: FX-PLAN-323
sprint: 323
feature: F576
req: FX-REQ-641
status: approved
date: 2026-05-03
---

# Sprint 323 Plan — F576: core/agent 120 files cleanup (Phase 46 Strangler 종결)

## 목표

`find packages/api/src/core/agent -type f | wc -l = 0`

Phase 46 Strangler Fig 패턴 완결 — F571/F575에서 fx-agent Worker로 모든 agent routes/services 복사 완료됨.
이제 packages/api/src/core/agent/ 원본 120개 파일을 정리하고 imports를 갱신한다.

## 범위 (F576 REQ-641)

### 핵심 작업
1. **core/agent → agent/ 이전**: `packages/api/src/core/agent/` 전체를 `packages/api/src/agent/`로 이동
2. **import path 갱신**: packages/api 내 모든 참조 파일 업데이트
3. **8 routes 제거**: app.ts에서 fx-agent로 이전된 8 routes 등록 해제
4. **12 route 통합 테스트 이전**: fx-agent로 이전 + import path 갱신
5. **Phase Exit P1~P4 Smoke Reality**: KOAMI Dogfood + dual_ai_reviews 검증

### 구체적 변경 내용

#### A. 디렉토리 이동 (git mv)
```
packages/api/src/core/agent/ → packages/api/src/agent/
```
- services/ (65) → packages/api/src/agent/services/
- schemas/ (15) → packages/api/src/agent/schemas/
- routes/ (15) → packages/api/src/agent/routes/
- orchestration/ (7) → packages/api/src/agent/orchestration/
- runtime/ (6) → packages/api/src/agent/runtime/
- streaming/ (3) → packages/api/src/agent/streaming/
- specs/ (8) → packages/api/src/agent/specs/
- index.ts → packages/api/src/agent/index.ts

#### B. Import Path 갱신 규칙
| 위치 | 변경 전 | 변경 후 |
|------|---------|---------|
| core/* 내부 (cross-domain) | `../../agent/X` | `../../../agent/X` |
| packages/api/src/ 루트 레벨 | `../core/agent/X` | `../agent/X` |
| modules/* (3-depth) | `../../../core/agent/X` | `../../../agent/X` |
| services/* (2-depth) | `../../core/agent/X` | `../../agent/X` |
| core/index.ts | `./agent/X` | `../agent/X` |

#### C. app.ts 8 Routes 제거
fx-gateway 이미 100% 라우팅 → packages/api app.ts 등록 해제:
- agentAdaptersRoute, agentDefinitionRoute, executionEventsRoute, taskStateRoute
- commandRegistryRoute, contextPassthroughRoute, workflowRoute, metaRoute

#### D. 12 Route Integration Tests → fx-agent
From: `packages/api/src/__tests__/[route].test.ts`
To: `packages/fx-agent/src/__tests__/[route].test.ts`
Import path: `../core/agent/routes/X` → `../routes/X`

### 영향 파일 수
- core/ 이동: 120 파일
- import 갱신 (비테스트): ~46 파일
- import 갱신 (테스트): ~108 파일 (in packages/api only)
- 이전 테스트 (fx-agent): ~12 파일

## 완료 기준 (Exit Criteria)
- [ ] `find packages/api/src/core/agent -type f | wc -l` = 0
- [ ] `turbo typecheck` — 19/19 PASS
- [ ] `turbo test` — all PASS (packages/api 포함)
- [ ] Match Rate ≥ 90%
- [ ] Phase Exit P1 (KOAMI Dogfood ≥ 1건)
- [ ] Phase Exit P2 (dual_ai_reviews D1 INSERT ≥ 1건)

## 제외 범위
- fx-agent 패키지 내부 코드 변경 없음 (이미 완성)
- shared 패키지 변경 없음
- D1 migration 없음 (schema 변경 없음)
