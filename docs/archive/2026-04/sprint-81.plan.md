---
code: FX-PLAN-081
title: "Sprint 81 — F236 Offering Pack + F238 MVP 추적 + F240 IR Bottom-up 채널 [P0+P1+P2]"
version: "1.0"
status: Active
category: PLAN
created: 2026-03-30
updated: 2026-03-30
author: Claude (Autopilot)
references:
  - "[[FX-REQ-228]] Offering Pack 생성"
  - "[[FX-REQ-230]] MVP 추적 + 자동화"
  - "[[FX-REQ-232]] IR Bottom-up 채널"
  - "[[FX-BD-V1]] BD Pipeline E2E PRD"
---

# Sprint 81 Plan — Offering Pack + MVP 추적 + IR Bottom-up 채널

## 1. 목표

Phase 7 BD Pipeline E2E 통합의 마지막 Sprint로, BD 파이프라인의 **후반부 3기능**을 구현한다:
- **패키징** (F236): Offering Pack — 영업/제안용 번들(사업제안서+데모링크+기술검증+가격)
- **추적** (F238): MVP 추적 — 상태(In Dev/Testing/Released) + PoC 배포 파이프라인
- **수집** (F240): IR Bottom-up — 사내 현장 제안 등록 폼 → biz-item 자동 변환

### 1.1 Background

- Sprint 79에서 파이프라인 대시보드(F232) + 산출물 공유(F233) + 의사결정 워크플로(F239) 구현
- Sprint 80에서 BDP 편집/버전관리(F234) + ORB/PRB 게이트(F235) + 사업제안서 자동생성(F237) 예정
- Sprint 81은 파이프라인 끝단(OFFERING→MVP)과 수집 채널 확장을 담당
- PRD: `docs/specs/fx-bd-v1/prd-final.md` — 워크플로 6, 7단계 + IR 채널

### 1.2 선행 조건

- ✅ Pipeline 단계 추적 + 칸반 뷰 (Sprint 79, F232)
- ✅ 산출물 공유 + 알림 + 의사결정 (Sprint 79, F233/F239)
- ✅ D1 마이그레이션 0066~0069 적용
- 📋 Sprint 80 (F234 BDP + F235 ORB/PRB + F237 사업제안서) — Sprint 81과 병렬 가능

## 2. 범위

### 2.1 In-Scope

#### F236: Offering Pack 생성 (FX-REQ-228, P0)

| 항목 | 설명 |
|------|------|
| **번들 구성** | 사업제안서 + 프로토타입 데모 링크 + 기술검증 결과 + 가격 정보 |
| **팩 생성** | biz-item의 기존 산출물에서 자동 수집 + 수동 추가 항목 |
| **상태 관리** | draft → review → approved → shared 4단계 |
| **공유 기능** | 외부 전달용 공유 링크 생성 (만료 설정) |
| **D1 테이블** | `offering_packs` + `offering_pack_items` |
| **API** | 6 endpoints (생성/조회/목록/항목추가/상태변경/공유링크) |

#### F238: MVP 추적 + 자동화 (FX-REQ-230, P1)

| 항목 | 설명 |
|------|------|
| **상태 추적** | In Dev → Testing → Released 3단계 |
| **메타데이터** | repo URL, deploy URL, tech stack, 담당자 |
| **이력 관리** | 상태 전환 타임라인 + 변경 사유 |
| **알림 연동** | 상태 변경 시 관련자 인앱 알림 (기존 notification-service 활용) |
| **D1 테이블** | `mvp_tracking` + `mvp_status_history` |
| **API** | 5 endpoints (등록/조회/목록/상태변경/이력) |

#### F240: IR Bottom-up 채널 (FX-REQ-232, P2)

| 항목 | 설명 |
|------|------|
| **제안 폼** | 제목, 설명, 카테고리, 제안 근거, 예상 효과 |
| **자동 변환** | 제안 승인 시 biz-item 자동 생성 + REGISTERED 단계 진입 |
| **상태 관리** | submitted → under_review → approved → rejected |
| **출처 추적** | biz-item에 source='ir_channel' + 원본 제안 ID 연결 |
| **D1 테이블** | `ir_proposals` |
| **API** | 5 endpoints (제출/목록/상세/승인/반려) |

### 2.2 Out-of-Scope

- Offering Pack ZIP 다운로드 (ORB/PRB 게이트와 함께, Sprint 80)
- PoC 환경 자동 배포 (CI/CD 파이프라인 연동 — 향후)
- 이메일 알림 발송 (인앱만)
- IR 제안 익명 모드
- 외부 사용자 제안 접수 (인증된 내부 사용자만)

## 3. 기술 접근

### 3.1 신규 D1 마이그레이션

| 파일 | 테이블 | 용도 |
|------|--------|------|
| `0070_offering_packs.sql` | `offering_packs` + `offering_pack_items` | Offering Pack 번들 + 항목 |
| `0071_mvp_tracking.sql` | `mvp_tracking` + `mvp_status_history` | MVP 상태 추적 + 이력 |
| `0072_ir_proposals.sql` | `ir_proposals` | IR Bottom-up 제안 |

### 3.2 API 엔드포인트 (16개)

#### F236 — Offering Pack (6ep)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/offering-packs` | Offering Pack 생성 (draft) |
| GET | `/offering-packs` | 팩 목록 (org별) |
| GET | `/offering-packs/:id` | 팩 상세 + 항목 목록 |
| POST | `/offering-packs/:id/items` | 항목 추가 (사업제안서/데모/기술검증/가격 등) |
| PATCH | `/offering-packs/:id/status` | 상태 변경 (draft→review→approved→shared) |
| POST | `/offering-packs/:id/share` | 외부 공유 링크 생성 |

#### F238 — MVP 추적 (5ep)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/mvp-tracking` | MVP 등록 (biz-item 연결) |
| GET | `/mvp-tracking` | MVP 목록 (org별) |
| GET | `/mvp-tracking/:id` | MVP 상세 + 상태 이력 |
| PATCH | `/mvp-tracking/:id/status` | 상태 변경 (in_dev→testing→released) |
| GET | `/mvp-tracking/:id/history` | 상태 변경 이력 |

#### F240 — IR Bottom-up (5ep)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/ir-proposals` | 제안 제출 |
| GET | `/ir-proposals` | 제안 목록 (org별, 필터) |
| GET | `/ir-proposals/:id` | 제안 상세 |
| POST | `/ir-proposals/:id/approve` | 승인 (→ biz-item 자동 생성) |
| POST | `/ir-proposals/:id/reject` | 반려 (사유 기록) |

### 3.3 Web 컴포넌트

| 컴포넌트 | 위치 | 설명 |
|----------|------|------|
| `OfferingPackPage` | `app/(app)/offering-packs/page.tsx` | Offering Pack 목록/생성 |
| `OfferingPackDetail` | `components/feature/offering-packs/` | 팩 상세 + 항목 관리 |
| `MvpTrackingPage` | `app/(app)/mvp-tracking/page.tsx` | MVP 추적 대시보드 |
| `MvpStatusTimeline` | `components/feature/mvp-tracking/` | 상태 전환 타임라인 |
| `IrProposalPage` | `app/(app)/ir-proposals/page.tsx` | IR 제안 목록 + 제출 폼 |
| `IrProposalForm` | `components/feature/ir-proposals/` | 제안 등록 폼 |

### 3.4 테스트 전략

| 대상 | 방법 | 예상 수 |
|------|------|---------|
| API 라우트 | `app.request()` 직접 호출 | ~48 tests |
| 서비스 로직 | 단위 테스트 (in-memory D1) | ~24 tests |
| Web 컴포넌트 | vitest + React Testing Library | ~12 tests |
| **합계** | | **~84 tests** |

## 4. 리스크

| ID | 리스크 | 대응 |
|----|--------|------|
| R1 | Offering Pack 항목 수집 시 산출물 누락 | 산출물 존재 체크 + 빈 항목 허용 |
| R2 | MVP 상태 전환 권한 혼동 | RBAC 기반 — 담당자 + 팀장만 |
| R3 | IR 제안 → biz-item 변환 시 데이터 매핑 | 필수 필드만 매핑, 나머지 수동 보완 |
| R4 | Sprint 80 미완료 시 사업제안서 참조 불가 | Offering Pack은 수동 항목 추가로 대체 가능 |

## 5. 구현 순서 (Worker 파일 매핑)

### Worker 1: D1 + 스키마 + 서비스 레이어

| 파일 | 작업 |
|------|------|
| `packages/api/src/db/migrations/0070_offering_packs.sql` | D1 마이그레이션 |
| `packages/api/src/db/migrations/0071_mvp_tracking.sql` | D1 마이그레이션 |
| `packages/api/src/db/migrations/0072_ir_proposals.sql` | D1 마이그레이션 |
| `packages/api/src/schemas/offering-pack.schema.ts` | Zod 스키마 |
| `packages/api/src/schemas/mvp-tracking.schema.ts` | Zod 스키마 |
| `packages/api/src/schemas/ir-proposal.schema.ts` | Zod 스키마 |
| `packages/api/src/services/offering-pack-service.ts` | Offering Pack 서비스 |
| `packages/api/src/services/mvp-tracking-service.ts` | MVP 추적 서비스 |
| `packages/api/src/services/ir-proposal-service.ts` | IR 제안 서비스 |

### Worker 2: API 라우트 + 테스트

| 파일 | 작업 |
|------|------|
| `packages/api/src/routes/offering-packs.ts` | Offering Pack 라우트 6ep |
| `packages/api/src/routes/mvp-tracking.ts` | MVP 추적 라우트 5ep |
| `packages/api/src/routes/ir-proposals.ts` | IR 제안 라우트 5ep |
| `packages/api/src/app.ts` | 라우트 등록 3줄 |
| `packages/api/src/__tests__/offering-packs.test.ts` | Offering Pack 테스트 |
| `packages/api/src/__tests__/mvp-tracking.test.ts` | MVP 추적 테스트 |
| `packages/api/src/__tests__/ir-proposals.test.ts` | IR 제안 테스트 |

### Worker 3: Web 컴포넌트 + 테스트

| 파일 | 작업 |
|------|------|
| `packages/web/src/app/(app)/offering-packs/page.tsx` | Offering Pack 페이지 |
| `packages/web/src/components/feature/offering-packs/offering-pack-detail.tsx` | 팩 상세 |
| `packages/web/src/app/(app)/mvp-tracking/page.tsx` | MVP 추적 페이지 |
| `packages/web/src/components/feature/mvp-tracking/mvp-status-timeline.tsx` | 상태 타임라인 |
| `packages/web/src/app/(app)/ir-proposals/page.tsx` | IR 제안 페이지 |
| `packages/web/src/components/feature/ir-proposals/ir-proposal-form.tsx` | 제안 폼 |
| `packages/web/src/__tests__/offering-packs.test.tsx` | Offering Pack 테스트 |
| `packages/web/src/__tests__/mvp-tracking.test.tsx` | MVP 추적 테스트 |
| `packages/web/src/__tests__/ir-proposals.test.tsx` | IR 제안 테스트 |

## 6. 성공 기준

| 기준 | 목표 |
|------|------|
| API 엔드포인트 | 16개 신규 |
| 테스트 통과 | ~84 tests all pass |
| typecheck | 0 errors |
| lint | 0 errors |
| D1 마이그레이션 | 0070~0072 적용 |
