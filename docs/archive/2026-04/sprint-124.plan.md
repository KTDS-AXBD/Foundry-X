---
code: FX-PLAN-S124
title: "E2E 상세 페이지(:id) 커버리지 확장"
version: "1.0"
status: Active
category: PLAN
feature: F302
sprint: 124
created: 2026-04-04
updated: 2026-04-04
author: Claude (Autopilot)
---

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F302 — E2E 상세 페이지 커버리지 확장 |
| Sprint | 124 |
| 예상 규모 | 신규 spec 1개 + mock factory 1개, ~400 LoC |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | `:id` 파라미터 상세 페이지 10개가 E2E 미커버 — 라우팅/API 연동 회귀 감지 불가 |
| **Solution** | Mock factory 패턴 기반 상세 페이지 전용 E2E spec 추가 + skip 재활성화 검토 |
| **Function UX Effect** | 상세 페이지 렌더링 + 에러 상태 + 네비게이션(뒤로가기) 검증으로 회귀 방지 |
| **Core Value** | E2E 커버리지 83% → 90%+ 달성, 파라미터 라우팅 안정성 보장 |

---

## 1. 목표

F300(Sprint 122)에서 E2E 커버리지를 69%→83%로 끌어올렸으나, `:id` 파라미터가 필요한 상세 페이지 10개가 여전히 미커버 상태예요. 이번 Sprint에서 이 갭을 해소하고, skip 6건의 재활성화 가능성을 검토해요.

### 1.1 성공 기준

- [ ] `:id` 상세 페이지 8건 이상 E2E 추가
- [ ] Mock factory 패턴 도입 — 테스트 데이터 일관성 확보
- [ ] skip 6건 재활성화 검토 (최소 2건 재활성화)
- [ ] 전체 E2E pass rate 100% 유지
- [ ] typecheck + lint 통과

## 2. 범위

### 2.1 대상 상세 페이지 (router.tsx 기준)

| # | 라우트 | 컴포넌트 | API 호출 | 파라미터 |
|---|--------|----------|----------|----------|
| 1 | `ax-bd/bdp/:bizItemId` | bdp-detail.tsx | `GET /bdp/:bizItemId` | bizItemId |
| 2 | `ax-bd/bmc/:id` | bmc-detail.tsx | `GET /ax-bd/bmc` (list → find) | id |
| 3 | `ax-bd/ideas/:id` | idea-detail.tsx | `GET /ax-bd/ideas` (list → find) | id |
| 4 | `collection/sr/:id` | sr-detail.tsx | `GET /sr/:id` | id |
| 5 | `discovery/items/:id` | discovery-detail.tsx | `GET /biz-items/:id` + `GET /discovery/progress/:id` | id |
| 6 | `gtm/outreach/:id` | gtm-outreach-detail.tsx | (outreach detail API) | id |
| 7 | `shaping/offering/:id` | offering-pack-detail.tsx | `GET /offering-packs/:id` | id |
| 8 | `shaping/offering/:id/brief` | offering-brief.tsx | (offering brief API) | id |
| 9 | `shaping/review/:runId` | shaping-detail.tsx | (shaping run API) | runId |
| 10 | `ax-bd/artifacts/:id` | artifact-detail.tsx | (artifact API) | id |

### 2.2 Skip 재활성화 후보 (6건)

| 파일 | 라인 | 사유 | 재활성화 가능성 |
|------|------|------|----------------|
| integration-path.spec.ts:122 | API 서버 미실행 조건부 skip | 조건부 — mock 환경에서는 해당 없음 | ⚠️ 검토 |
| hitl-review.spec.ts:130 | HITL 패널 상태 강제 설정 | mock으로 대체 가능 | ✅ 높음 |
| hitl-review.spec.ts:152 | artifactLink 미존재 조건부 | mock으로 대체 가능 | ✅ 높음 |
| hitl-review.spec.ts:191 | artifactLink 미존재 조건부 | mock으로 대체 가능 | ✅ 높음 |
| hitl-review.spec.ts:236 | artifactLink 미존재 조건부 | mock으로 대체 가능 | ✅ 높음 |
| help-agent.spec.ts:181 | 새 대화 리셋 | 기능 안정성 확인 필요 | ⚠️ 검토 |

### 2.3 범위 외

- API 서버 변경 없음
- 기존 E2E 수정 없음 (신규 추가만)
- 프로덕션 배포 불필요 (E2E만)

## 3. 기술 접근

### 3.1 Mock Factory 패턴

`e2e/fixtures/mock-factory.ts`에 상세 페이지 mock 데이터 생성 함수를 집중시켜요:

```typescript
// 각 도메인별 mock factory
export function makeBizItem(overrides?: Partial<BizItemDetail>): BizItemDetail
export function makeBmc(overrides?: Partial<BmcDetail>): BmcDetail
export function makeBdpVersion(overrides?: Partial<BdpVersion>): BdpVersion
export function makeSrDetail(overrides?: Partial<SrDetailItem>): SrDetailItem
export function makeOfferingPack(overrides?: Partial<OfferingPackDetail>): OfferingPackDetail
export function makeOutreachItem(overrides?: Partial<OutreachItem>): OutreachItem
```

### 3.2 E2E Spec 구조

`e2e/detail-pages.spec.ts` — 단일 spec 파일에 모든 상세 페이지 테스트 집중:

```
describe("상세 페이지(:id) 렌더링 검증")
  ├── test("ax-bd/bdp/:bizItemId 상세 렌더링")
  ├── test("ax-bd/bmc/:id 상세 렌더링")
  ├── test("ax-bd/ideas/:id 상세 렌더링")
  ├── test("collection/sr/:id 상세 렌더링")
  ├── test("discovery/items/:id 상세 렌더링")
  ├── test("gtm/outreach/:id 상세 렌더링")
  ├── test("shaping/offering/:id 상세 렌더링")
  ├── test("shaping/offering/:id/brief 상세 렌더링")
  ├── test("shaping/review/:runId 상세 렌더링")   [stretch]
  └── test("ax-bd/artifacts/:id 상세 렌더링")     [stretch]
```

### 3.3 테스트 검증 항목 (공통)

각 상세 페이지 테스트는 최소 3가지를 검증:

1. **렌더링**: `main` 영역 visible + 주요 heading/badge 존재
2. **데이터 표시**: mock 데이터의 title/name이 화면에 표시
3. **뒤로가기**: ArrowLeft 링크 존재 + href 검증

## 4. 구현 순서

| Phase | 작업 | 산출물 |
|-------|------|--------|
| A | Mock factory 생성 | `e2e/fixtures/mock-factory.ts` |
| B | 상세 페이지 E2E 8건 작성 | `e2e/detail-pages.spec.ts` |
| C | Skip 재활성화 (hitl-review 4건) | `e2e/hitl-review.spec.ts` 수정 |
| D | E2E 전체 실행 + 결과 확인 | pass rate 100% 검증 |

## 5. 파일 매핑

### 신규 생성

| 파일 | 용도 |
|------|------|
| `packages/web/e2e/fixtures/mock-factory.ts` | 상세 페이지 mock 데이터 factory |
| `packages/web/e2e/detail-pages.spec.ts` | 상세 페이지 E2E spec |

### 수정

| 파일 | 변경 내용 |
|------|-----------|
| `packages/web/e2e/hitl-review.spec.ts` | skip → mock 기반 활성화 (4건) |

## 6. 리스크

| 리스크 | 대응 |
|--------|------|
| 상세 페이지 컴포넌트가 복잡한 API 체인 의존 | mock factory에서 최소 필수 필드만 제공, 나머지는 optional |
| hitl-review skip이 실제 UI 의존성으로 재활성화 불가 | 조건부 skip 유지 + mock 보강으로 우회 |
| offering-brief가 offering-pack 선행 데이터 필요 | 두 API 모두 mock하여 독립 테스트 가능하게 |

## 7. 의존성

- **선행**: F300 (E2E 종합 정비) ✅ 완료
- **후행**: 없음 (독립)
