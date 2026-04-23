---
id: FX-DESIGN-318
title: Sprint 318 Design — F570 Offering 완전 이관
sprint: 318
f_items: [F570]
author: Claude
created: 2026-04-24
status: active
---

# Sprint 318 Design — F570 Offering 완전 이관

## §1 목적

F541 Walking Skeleton이 남긴 잔존분을 완결처리:
- `offeringPacksRoute` (api/modules/launch/) → fx-offering 이전
- `core/offering/` 잔존 디렉토리 완전 삭제
- fx-gateway F541 명시 라우팅 → F570으로 정리 (offering-packs 추가)
- 테스트 37건 fx-offering으로 이전

## §2 D1 체크리스트

| # | 항목 | 결과 |
|---|------|------|
| D1 | 주입 사이트 전수 검증 | offeringPacksRoute: app.ts 1개 마운트 → fx-offering app.ts 1개로 전환 |
| D2 | 식별자 계약 검증 | offering-packs ID: `uuid()` 생성, 경로 파라미터 `:id` 패턴 동일 |
| D3 | Breaking change 영향도 | DB 스키마 변경 없음 (D1 migration 불필요). 기존 offering-packs 데이터 영향 없음 |
| D4 | TDD Red 파일 존재 | `fx-offering/src/__tests__/offering-packs.test.ts` — RED FAIL 확인 필수 |

## §3 아키텍처

### 라우팅 변경 (Before → After)

```
Before (F541):
Browser → fx-gateway
  ├── /api/offerings/* → OFFERING (fx-offering)
  ├── /api/bdp/* → OFFERING (fx-offering)
  ├── /api/methodologies/* → OFFERING (fx-offering)
  ├── /api/biz-items/:id/business-plan* → OFFERING (fx-offering)
  ├── /api/biz-items/:id/methodology* → OFFERING (fx-offering)
  └── /api/offering-packs* → MAIN_API (api) ← 잔존!

After (F570):
Browser → fx-gateway
  ├── /api/offerings/* → OFFERING (fx-offering)
  ├── /api/bdp/* → OFFERING (fx-offering)
  ├── /api/methodologies/* → OFFERING (fx-offering)
  ├── /api/biz-items/:id/business-plan* → OFFERING (fx-offering)
  ├── /api/biz-items/:id/methodology* → OFFERING (fx-offering)
  └── /api/offering-packs* → OFFERING (fx-offering) ← 이전 완료
```

### core/offering/ 삭제 경로

```
packages/api/src/core/offering/ [DELETE 대상]
├── index.ts → DELETE
├── routes/ (12개) → DELETE (이미 fx-offering에 존재)
├── schemas/ (19개) → DELETE (이미 fx-offering에 존재)
└── services/ (29개)
    ├── prd-generator.ts → MOVE to api/src/services/
    ├── prd-template.ts → MOVE to api/src/services/
    ├── methodology-types.ts → MOVE to api/src/services/
    └── (나머지 26개) → DELETE (이미 fx-offering에 존재)
```

### import 경로 변경

| 파일 | 변경 전 | 변경 후 |
|------|---------|---------|
| `api/src/services/prototype-generator.ts` | `../core/offering/services/prd-generator.js` | `./prd-generator.js` |
| `api/src/services/pm-skills-module.ts` (×2) | `../core/offering/services/methodology-types.js` | `./methodology-types.js` |
| `api/src/services/prd-generator.ts` (이동 후) | `../../agent/services/` | `../core/agent/services/` |
| `api/src/services/prd-generator.ts` (이동 후) | `../../discovery/services/` | `../core/discovery/services/` |
| `api/src/services/prd-template.ts` (이동 후) | `../../discovery/services/` | `../core/discovery/services/` |

## §4 테스트 계약 (TDD Red Target)

### fx-offering/src/__tests__/offering-packs.test.ts

```typescript
// F570 TDD Red — offering-packs 라우트 401 auth guard
describe("F570: offering-packs routes", () => {
  test("POST /api/offering-packs without auth → 401", ...);
  test("GET /api/offering-packs without auth → 401", ...);
  test("GET /api/offering-packs/:id without auth → 401", ...);
});
```

## §5 파일 매핑 (D1 체크리스트 근거)

### 신규 생성 (fx-offering)

| 파일 | 역할 |
|------|------|
| `packages/fx-offering/src/routes/offering-packs.ts` | Offering Pack CRUD + Brief 라우트 (9 엔드포인트) |
| `packages/fx-offering/src/__tests__/offering-packs.test.ts` | TDD Red → Green (5 auth guard tests) |

> `mock-d1.ts` / `better-sqlite3` — 401 테스트는 DB에 도달 전 응답, 불필요 판명

### 수정 (fx-offering)

| 파일 | 변경 내용 |
|------|----------|
| `packages/fx-offering/src/app.ts` | `offeringPacksRoute` import + `authenticated.route()` mount 추가 |

### 수정 (api)

| 파일 | 변경 내용 |
|------|----------|
| `packages/api/src/app.ts` | line 21: offeringPacksRoute import 제거 / line 326: mount 제거 |
| `packages/api/src/modules/launch/index.ts` | `offeringPacksRoute` export 제거 |
| `packages/api/src/services/prototype-generator.ts` | import 경로 수정 |
| `packages/api/src/services/pm-skills-module.ts` | import 경로 수정 (×2) |

### 수정 (fx-gateway)

| 파일 | 변경 내용 |
|------|----------|
| `packages/fx-gateway/src/app.ts` | F541 명시 12줄 → F570 14줄로 교체 (offering-packs 2줄 추가) |

### 이동 (api/core/offering → api/src/services)

| 원본 | 대상 | 이유 |
|------|------|------|
| `core/offering/services/prd-generator.ts` | `services/prd-generator.ts` | prototype-generator가 사용 |
| `core/offering/services/prd-template.ts` | `services/prd-template.ts` | prd-generator의 내부 의존 |
| `core/offering/services/methodology-types.ts` | `services/methodology-types.ts` | pm-skills-module이 사용 |

### 삭제 (api)

| 대상 | 이유 |
|------|------|
| `packages/api/src/modules/launch/routes/offering-packs.ts` | fx-offering으로 이전 |
| `packages/api/src/core/offering/routes/` (12개) | fx-offering 이전 완료 |
| `packages/api/src/core/offering/services/` 일부 (26→10 복원) | F572/F574 deferred — biz-items.ts cross-domain dep 잔존 |
| `packages/api/src/core/offering/schemas/` 일부 | F572/F574 deferred — biz-items.ts dep |
| `packages/api/src/core/offering/index.ts` | 삭제 (core/index.ts에서 export 제거) |
| `packages/api/src/__tests__/` offering 33개 파일 | core/offering import 파일 삭제 |

## §6 Phase Exit P1~P4

| # | 항목 | 검증 방법 |
|---|------|----------|
| P1 | prod /api/offering-packs 실호출 | curl + wrangler tail 30초 |
| P2 | 4경로 200 응답 | GET /api/offerings / GET /api/offering-packs / GET /api/bdp / GET /api/methodologies |
| P3 | KPI 실측 | 응답 JSON 또는 Worker 로그 기록 |
| P4 | 회고 작성 | `docs/dogfood/sprint-318-offering-migration.md` |

## §7 FAIL 조건

1. `grep -rn "core/offering" packages/api` functional import > 0건 (주석·ESLint fixture 제외)
2. Phase Exit P1~P4 미충족
3. fx-gateway에 offering-packs → MAIN_API 라우팅 잔존 (OFFERING 미연결)
4. Gap Match Rate < 90%
5. typecheck + lint + test 실패
