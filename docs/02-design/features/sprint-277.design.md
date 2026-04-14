---
id: FX-DESIGN-277
title: Sprint 277 Design — F522 shared 슬리밍 + F523 D1 스키마 격리
sprint: 277
f_items: [F522, F523]
req: FX-REQ-550, FX-REQ-551
status: done
created: 2026-04-13
---

# Sprint 277 Design — F522 shared 슬리밍 + F523 D1 스키마 격리

## 1. 목표

MSA Walking Skeleton Phase 2 — shared 타입 3파일을 fx-discovery 내부로 이동하고,
fx-discovery에 실제 Discovery 라우트를 추가하며, fx-gateway Service Binding을 활성화한다.

## 2. 아키텍처 결정

### D1 공유 DB 유지 (Option B 확정)

```
[현재] foundry-x-api ─── D1 foundry-x-db (single binding)
[이번] fx-discovery  ─┬─ D1 foundry-x-db (동일 DB, 동일 schema)
                       │   → Option B: 공유 DB, 테이블 prefix 없음
                       │   → Option A(별도 DB)는 팀 확장 시점(F560~)으로 연기
```

**근거**: 현재 팀 규모(1명)에서 D1 별도 생성 시 마이그레이션 이중화 비용이 더 큼.
`packages/fx-discovery/wrangler.toml`에 명시 완료. 이 Design 문서가 공식 결정 기록.

### Service Binding 활성화 흐름

```
[Before] fx-gateway → MAIN_API (if DISCOVERY_ENABLED=="true") → 폴백 MAIN_API
[After]  fx-gateway → DISCOVERY (직접, DISCOVERY_ENABLED 제거) / MAIN_API (그 외)
```

DISCOVERY_ENABLED 환경변수 스위치를 제거하고 하드와이어링으로 전환.
fx-discovery 배포가 완료되면 즉시 트래픽 수신.

## 3. 타입 이동 설계 (F522)

### 이동 대상

| 원본 (shared/src/) | 대상 (fx-discovery/src/types/) | 줄수 |
|--------------------|-------------------------------|------|
| `discovery-report.ts` | `discovery-report.ts` | 250 |
| `discovery-v2.ts` | `discovery-v2.ts` | 115 |
| `methodology.ts` | `methodology.ts` | 28 |

### 하위 호환 전략 (T3) — Sprint 277 구현 방식

Sprint 277에서는 T3를 보수적으로 구현한다:
- shared 원본 3파일은 **삭제하지 않고** `@deprecated` 주석만 추가
- shared/src/index.ts re-export 경로는 기존 로컬 파일(`./discovery-report.js` 등) **그대로 유지**

**근거**: workspace 패키지 간 직접 re-export(`@foundry-x/fx-discovery/types/*.js`)는
fx-discovery의 package.json exports 필드 정비 후(T4, P1) 안전하게 전환 가능.
지금 경로를 변경하면 빌드 순서 오류 위험이 있어 Sprint 278로 연기.

> **T4 전환 목표(Sprint 278)**: shared/src/index.ts가 fx-discovery를 참조하도록 re-export 경로 변경 후 shared 원본 3파일 삭제.

### Shaping 타입 서브폴더 (T2, P1)

`packages/shared/src/prototype.ts`, `prototype-feedback.ts`는 이번 Sprint에서
이동하지 않고 shared 내에 `shaping/` 서브폴더 후보로 주석 표시만.

## 4. fx-discovery 라우트 설계 (F523)

### GET /api/discovery/items

```
Request:  GET /api/discovery/items?limit=20&offset=0
Response: { items: BizItem[], total: number }
```

**BizItem 스키마** (biz_items 테이블 기반):
```typescript
interface BizItem {
  id: string;
  title: string;    // 역동기화: Design 초안 name→title (DB 실제 컬럼)
  source: string;   // 역동기화: Design 초안 category→source (DB 실제 컬럼)
  status: string;
  created_at: string;
}
```

### 서비스 레이어

`packages/fx-discovery/src/services/biz-item.service.ts`
- `listBizItems(db: D1Database, limit: number, offset: number): Promise<{ items: BizItem[], total: number }>`
- prepared statement 사용 (raw SQL 직접 사용 금지)
- 빈 DB 케이스: `{ items: [], total: 0 }` 반환

## 5. 파일 매핑

### 신규 파일

| 파일 | 목적 | F-item |
|------|------|--------|
| `packages/fx-discovery/src/types/discovery-report.ts` | shared에서 이동 | F522 |
| `packages/fx-discovery/src/types/discovery-v2.ts` | shared에서 이동 | F522 |
| `packages/fx-discovery/src/types/methodology.ts` | shared에서 이동 | F522 |
| `packages/fx-discovery/src/routes/items.ts` | GET /api/discovery/items | F523 |
| `packages/fx-discovery/src/services/biz-item.service.ts` | biz_items 조회 | F523 |
| `packages/fx-discovery/src/__tests__/items.test.ts` | TDD Red → Green | F523 |
| `docs/02-design/features/d1-access-policy.md` | D1 접근 규약 문서 | F523 |

### 수정 파일

| 파일 | 변경 내용 | F-item |
|------|-----------|--------|
| `packages/shared/src/index.ts` | re-export 경로 변경 (fx-discovery 참조) | F522 |
| `packages/shared/src/discovery-report.ts` | `@deprecated` 주석 추가, T4 시점 삭제 예정 | F522 |
| `packages/shared/src/discovery-v2.ts` | `@deprecated` 주석 추가, T4 시점 삭제 예정 | F522 |
| `packages/shared/src/methodology.ts` | `@deprecated` 주석 추가, T4 시점 삭제 예정 | F522 |
| `packages/fx-discovery/src/app.ts` | items 라우트 마운트 | F523 |
| `packages/fx-discovery/package.json` | exports 필드 `./types/*` 추가 | F522 |
| `packages/fx-gateway/wrangler.toml` | DISCOVERY binding 활성화 | F523 |
| `packages/fx-gateway/src/app.ts` | DISCOVERY_ENABLED 제거, 직접 라우팅 | F523 |
| `packages/fx-gateway/src/env.ts` | DISCOVERY_ENABLED 제거, DISCOVERY 필수화 | F523 |
| `.github/workflows/deploy.yml` | fx-gateway + fx-discovery deploy job 추가 | F523 |

## 6. TDD 테스트 계약

### fx-discovery items GET (`__tests__/items.test.ts`)

```
describe('GET /api/discovery/items', () => {
  it('빈 DB에서 빈 배열 반환')        // { items: [], total: 0 }
  it('limit/offset 파라미터 적용')    // limit=5 → items.length <= 5
  it('응답 스키마 일치')              // id, title, source, status, created_at (역동기화)
  it('비숫자 파라미터 400 반환')      // 구현 추가분 (역동기화)
})
```

### fx-gateway 라우팅 (`__tests__/gateway.test.ts`)

```
describe('fx-gateway DISCOVERY routing', () => {
  it('/api/discovery/* → DISCOVERY Service Binding으로 전달')
  it('/api/other/* → MAIN_API로 전달')
  it('/api/discovery/health → DISCOVERY로 전달')   // 구현 추가분 (역동기화)
  it('요청 헤더가 Service Binding에 전달')          // 구현 추가분 (역동기화)
})
```

### shared import 호환 (`packages/api` 기존 테스트)

- `packages/api` 기존 테스트가 shared re-export 변경 후에도 전량 PASS

## 7. D1 접근 규약 요약

| Worker | 접근 테이블 | 권한 |
|--------|------------|------|
| `foundry-x-api` | 모든 테이블 | READ/WRITE |
| `fx-discovery` | `biz_items`, `discovery_items`, `discovery_reports`, `discovery_v2_items`, `biz_evaluation_reports` | READ (이번 Sprint) |
| `fx-gateway` | 없음 | — (proxy only) |

규약 상세: `docs/02-design/features/d1-access-policy.md`

## 8. 성공 기준 검증 매핑

| Plan §8 기준 | 검증 방법 | Sprint 277 상태 |
|-------------|----------|----------------|
| shared 파일 24 → 21개 이하 | `ls packages/shared/src/*.ts \| wc -l` | **Sprint 278로 연기** (T4 직접 삭제는 re-export 정비 후) |
| fx-discovery `/api/discovery/items` 응답 | vitest + health check |
| fx-gateway Discovery binding 라우팅 | vitest mock fetch |
| deploy.yml fx-gateway + fx-discovery job | CI 파이프라인 확인 |
| 기존 api/web 테스트 PASS | `pnpm turbo test` |
| D1 접근 규약 문서 | `docs/02-design/features/d1-access-policy.md` 존재 |
