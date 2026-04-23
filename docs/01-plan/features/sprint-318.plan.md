---
id: FX-PLAN-318
title: Sprint 318 — F570 Offering 완전 이관
sprint: 318
f_items: [F570]
req_codes: [FX-REQ-613]
priority: P1
author: Claude
created: 2026-04-24
status: active
---

# Sprint 318 Plan — F570 Offering 완전 이관

## F570 개요

Phase 45 Batch 4 — F541 Walking Skeleton 후속. Offering 도메인을 MAIN_API에서 fx-offering Worker로 완전 이관.

## 현황 (착수 시점)

| 항목 | 현황 |
|------|------|
| fx-offering routes | 12개 이미 마운트 (F541) |
| offeringPacksRoute | api/modules/launch/ 에 잔존 (미이관) |
| core/offering/ | api에 잔존 (routes/services/schemas) |
| api/__tests__/ offering | 37개 파일 잔존 |
| fx-gateway F541 라우팅 | 12줄 명시 라우팅 (offering-packs 미포함) |
| cross-domain grep (api) | 현재 5건 (offering-packs + prototype-generator + pm-skills-module) |

## 이관 범위 (SCOPE LOCKED)

### (a) Offering 이관 4가지
1. `offering-packs` 라우트: `modules/launch/routes/offering-packs.ts` → `fx-offering/src/routes/offering-packs.ts`
2. `core/offering/` 정리: api에서 완전 삭제 (prd-generator, prd-template, methodology-types는 `api/src/services/`로 이동)
3. 테스트 37건: `api/src/__tests__/` → `fx-offering/src/__tests__/` (이동 + 경로 수정)
4. `api/src/app.ts`: offeringPacksRoute import/mount 제거 (line 21, 326)

### (b) fx-gateway 정리
- F541 명시 라우팅 12줄 제거 → F570 레이블로 재등록 (offering-packs 2줄 추가 = 14줄)

### (c) Cross-domain grep 0건
- `grep -rn "core/offering" packages/fx-discovery packages/fx-shaping packages/api` → 0건

### (d) Phase Exit P1~P4
- P1: prod /api/offering-packs 실호출 200 확인
- P2: 4경로 200 응답 (list/create/detail/export)
- P3: 도메인 KPI 실측
- P4: 회고 docs/dogfood/sprint-318-offering-migration.md

## 아키텍처 결정

### prd-generator.ts, prd-template.ts, methodology-types.ts 처리
- 현재: `api/src/core/offering/services/` 에 존재하며 api 내부에서 참조
- 결정: `api/src/services/`로 이동 (api 내부 서비스로 재분류, 도메인 경계 해소)
- 이유: fx-offering에 이미 복사본 존재. api 쪽은 agent/discovery와 통합된 API 레벨 서비스

### offering-packs 라우트 적응
- `Env` → `OfferingEnv` 타입 변경
- `core/offering/services/offering-brief-service.js` → `./services/offering-brief-service.js` (fx-offering 내 존재)
- `core/offering/schemas/offering-brief.schema.js` → `./schemas/offering-brief.schema.js` (fx-offering 내 존재)

### gateway 라우팅
- F541 명시 12줄 제거, F570 레이블 14줄로 교체 (offering-packs 경로 추가)

## 변경 파일 목록

### CREATE
- `packages/fx-offering/src/routes/offering-packs.ts`
- `packages/fx-offering/src/__tests__/offering-packs.test.ts` (TDD Red)
- `packages/fx-offering/src/__tests__/helpers/mock-d1.ts` (복사)
- `packages/api/src/services/prd-generator.ts` (이동)
- `packages/api/src/services/prd-template.ts` (이동)
- `packages/api/src/services/methodology-types.ts` (이동)
- `docs/01-plan/features/sprint-318.plan.md` (이 파일)
- `docs/02-design/features/sprint-318.design.md`

### MODIFY
- `packages/fx-offering/src/app.ts` — offeringPacksRoute 마운트 추가
- `packages/api/src/app.ts` — offeringPacksRoute import/mount 제거
- `packages/api/src/modules/launch/index.ts` — offeringPacksRoute export 제거
- `packages/fx-gateway/src/app.ts` — F541 라우팅 제거, F570 재등록
- `packages/api/src/services/prototype-generator.ts` — import 경로 수정
- `packages/api/src/services/pm-skills-module.ts` — import 경로 수정
- `packages/fx-offering/package.json` — better-sqlite3 devDependency 추가

### DELETE
- `packages/api/src/modules/launch/routes/offering-packs.ts`
- `packages/api/src/core/offering/` (전체 디렉토리)
- `packages/api/src/__tests__/` offering 관련 37개 파일 (fx-offering으로 이동 후 삭제)

## TDD 계획

### Red Phase (F570 red)
- `fx-offering/src/__tests__/offering-packs.test.ts`: GET/POST /api/offering-packs 401 체크
- `vitest run` → FAIL 확인

### Green Phase (F570 green)
- offering-packs 라우트 구현 + app.ts 마운트
- `vitest run` → PASS 확인

## 성공 기준

1. `grep -rn "core/offering" packages/api` → 0건
2. `pnpm typecheck` api + fx-offering → PASS
3. `pnpm test` api + fx-offering → PASS
4. fx-gateway offering-packs 라우팅 추가
5. Phase Exit P1~P4 충족
