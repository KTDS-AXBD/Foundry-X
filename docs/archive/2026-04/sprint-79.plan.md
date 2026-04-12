---
code: FX-PLAN-079
title: "Sprint 79 — F232 파이프라인 대시보드 + F233 산출물 공유 + F239 의사결정 워크플로 [P0 Core]"
version: "1.0"
status: Active
category: PLAN
created: 2026-03-30
updated: 2026-03-30
author: Claude (Autopilot)
references:
  - "[[FX-REQ-224]] 파이프라인 통합 대시보드"
  - "[[FX-REQ-225]] 산출물 공유 시스템"
  - "[[FX-REQ-231]] 의사결정 워크플로"
  - "[[FX-BD-V1]] BD Pipeline E2E PRD"
---

# Sprint 79 Plan — 파이프라인 + 공유 + 의사결정 [P0 Core]

## 1. 목표

Phase 7 BD Pipeline E2E 통합의 첫 Sprint로, BD 아이템 라이프사이클의 **코어 삼각형**을 구현한다:
- **가시성** (F232): 파이프라인 대시보드 — 전체 아이템 현황을 칸반/파이프라인 뷰로 조회
- **협업** (F233): 산출물 공유 — 링크 공유 + 리뷰 요청 + 알림
- **통제** (F239): 의사결정 워크플로 — Go/Hold/Drop + 승인/이력/자동 전환

### 1.1 Background

- Phase 5에서 biz-items CRUD + Discovery + BMC/PRD 생성까지 완료 (Sprint 51~69)
- Phase 6에서 BMAD/OpenSpec 벤치마킹 + 에코시스템 통합 완료 (Sprint 75~78)
- Phase 7은 BD 프로세스의 **End-to-End 파이프라인**을 연결하는 단계
- PRD: `docs/specs/fx-bd-v1/prd-final.md` — 워크플로 7단계 중 1, 3, 4단계에 해당

### 1.2 선행 조건

- ✅ biz-items CRUD + 분류 (Sprint 51~53)
- ✅ Discovery 9기준 + 분석 경로 (Sprint 53, 69)
- ✅ BMC/PRD/Prototype 생성 (Sprint 56~58)
- ✅ D1 마이그레이션 0001~0065 적용

## 2. 범위

### 2.1 In-Scope

#### F232: 파이프라인 통합 대시보드 (FX-REQ-224, P0)

| 항목 | 설명 |
|------|------|
| **칸반 뷰** | 단계별 컬럼으로 아이템 카드 배치, 드래그 앤 드롭 단계 전환 |
| **파이프라인 뷰** | 단계 흐름도 + 아이템 개수/진행률 요약 |
| **아이템 카드** | 제목, 현재 단계, 진행률, 담당자, 다음 액션 표시 |
| **필터/정렬** | 단계, 담당자, 우선순위, 최근 업데이트 기준 |
| **D1 테이블** | `pipeline_stages` — 아이템별 단계 추적 |
| **API** | 5 endpoints (목록/상세/단계변경/통계/필터) |

#### F233: 산출물 공유 시스템 (FX-REQ-225, P0)

| 항목 | 설명 |
|------|------|
| **공유 링크** | 인증 기반 토큰 생성, 만료 설정 (1일/7일/30일/무제한) |
| **접근 레벨** | view / comment / edit 3단계 |
| **리뷰 요청** | 특정 사용자에게 리뷰 요청 + 알림 발송 |
| **인앱 알림** | 단계 전환, 리뷰 요청, 의사결정 시 인앱 노티 |
| **D1 테이블** | `share_links` + `notifications` |
| **API** | 6 endpoints (생성/조회/무효화/리뷰요청/알림목록/읽음처리) |

#### F239: 단계별 의사결정 워크플로 (FX-REQ-231, P0)

| 항목 | 설명 |
|------|------|
| **Go/Hold/Drop** | 팀장 전용 의사결정 버튼 3종 |
| **승인/반려** | 승인 시 자동 다음 단계 전환, 반려 시 Hold |
| **코멘트** | 의사결정 근거 기록 필수 |
| **이력 관리** | 전체 의사결정 타임라인 조회 |
| **자동 알림** | 의사결정 시 관련자 인앱 알림 발송 |
| **D1 테이블** | `decisions` |
| **API** | 4 endpoints (결정등록/이력조회/통계/대기목록) |

### 2.2 Out-of-Scope

- 이메일 알림 발송 (인앱만, 이메일은 Sprint 80+)
- BDP 에디터 / 버전관리 (F234, Sprint 80)
- ORB/PRB 게이트 문서 (F235, Sprint 80)
- Offering Pack / MVP 추적 (F236/F238, Sprint 81)
- 외부 공유 링크 (인증 사용자만, 비인증 공유는 향후)

## 3. 기술 접근

### 3.1 신규 D1 마이그레이션

| 파일 | 테이블 | 용도 |
|------|--------|------|
| `0066_pipeline_stages.sql` | `pipeline_stages` | 아이템별 단계 추적 (stage, entered_at, exited_at) |
| `0067_share_links.sql` | `share_links` | 공유 링크 (token, biz_item_id, access_level, expires_at) |
| `0068_notifications.sql` | `notifications` | 인앱 알림 (type, recipient_id, biz_item_id, read_at) |
| `0069_decisions.sql` | `decisions` | 의사결정 이력 (biz_item_id, decision, comment, decided_by) |

### 3.2 파이프라인 단계 정의

BD 프로세스 7단계를 enum으로 정의:

```
REGISTERED → DISCOVERY → FORMALIZATION → REVIEW → DECISION → OFFERING → MVP
```

각 단계는 `pipeline_stages` 테이블에서 `entered_at`/`exited_at`으로 추적한다.

### 3.3 API 엔드포인트 (15개)

#### F232 — 파이프라인 (5ep)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/pipeline/items` | 파이프라인 아이템 목록 (단계별 필터) |
| GET | `/pipeline/items/:id` | 아이템 상세 + 단계 이력 |
| PATCH | `/pipeline/items/:id/stage` | 단계 전환 (수동) |
| GET | `/pipeline/stats` | 단계별 통계 (개수, 평균 체류시간) |
| GET | `/pipeline/kanban` | 칸반 뷰 데이터 (단계별 그룹핑) |

#### F233 — 공유 (6ep)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/share-links` | 공유 링크 생성 |
| GET | `/share-links` | 내 공유 링크 목록 |
| DELETE | `/share-links/:id` | 공유 링크 무효화 |
| POST | `/share-links/:id/review-request` | 리뷰 요청 발송 |
| GET | `/notifications` | 알림 목록 (인앱) |
| PATCH | `/notifications/:id/read` | 알림 읽음 처리 |

#### F239 — 의사결정 (4ep)

| Method | Path | 설명 |
|--------|------|------|
| POST | `/decisions` | 의사결정 등록 (Go/Hold/Drop) |
| GET | `/decisions` | 의사결정 이력 조회 |
| GET | `/decisions/stats` | 의사결정 통계 |
| GET | `/decisions/pending` | 대기 중 의사결정 목록 |

### 3.4 Web 컴포넌트

| 컴포넌트 | 위치 | 설명 |
|----------|------|------|
| `PipelinePage` | `app/(app)/pipeline/page.tsx` | 메인 파이프라인 페이지 |
| `KanbanBoard` | `components/feature/pipeline/` | 칸반 뷰 컴포넌트 |
| `PipelineView` | `components/feature/pipeline/` | 파이프라인 흐름도 뷰 |
| `ItemCard` | `components/feature/pipeline/` | 아이템 카드 |
| `ShareDialog` | `components/feature/sharing/` | 공유 링크 생성 다이얼로그 |
| `NotificationList` | `components/feature/notifications/` | 알림 목록 |
| `DecisionPanel` | `components/feature/decisions/` | Go/Hold/Drop 의사결정 패널 |

### 3.5 테스트 전략

| 대상 | 방법 | 예상 수 |
|------|------|---------|
| API 라우트 | `app.request()` 직접 호출 | ~45 tests |
| 서비스 로직 | 단위 테스트 (in-memory D1) | ~30 tests |
| Web 컴포넌트 | vitest + React Testing Library | ~15 tests |
| **합계** | | **~90 tests** |

## 4. 리스크

| ID | 리스크 | 대응 |
|----|--------|------|
| R1 | pipeline_stages와 기존 biz_items 조인 성능 | 인덱스 추가, 페이지네이션 적용 |
| R2 | 알림 폭증 (대량 단계 전환 시) | 배치 알림 + 중복 억제 로직 |
| R3 | 의사결정 권한 혼동 (팀원 vs 팀장) | RBAC 미들웨어에서 role 검증 |

## 5. 구현 순서 (Worker 파일 매핑)

### Worker 1: D1 + 서비스 레이어 (기반)

| 파일 | 작업 |
|------|------|
| `packages/api/src/db/migrations/0066_pipeline_stages.sql` | D1 마이그레이션 |
| `packages/api/src/db/migrations/0067_share_links.sql` | D1 마이그레이션 |
| `packages/api/src/db/migrations/0068_notifications.sql` | D1 마이그레이션 |
| `packages/api/src/db/migrations/0069_decisions.sql` | D1 마이그레이션 |
| `packages/api/src/services/pipeline-service.ts` | 파이프라인 서비스 |
| `packages/api/src/services/share-link-service.ts` | 공유 링크 서비스 |
| `packages/api/src/services/notification-service.ts` | 알림 서비스 |
| `packages/api/src/services/decision-service.ts` | 의사결정 서비스 |
| `packages/api/src/schemas/pipeline.schema.ts` | Zod 스키마 |
| `packages/api/src/schemas/share-link.schema.ts` | Zod 스키마 |
| `packages/api/src/schemas/notification.schema.ts` | Zod 스키마 |
| `packages/api/src/schemas/decision.schema.ts` | Zod 스키마 |

### Worker 2: API 라우트 + 테스트

| 파일 | 작업 |
|------|------|
| `packages/api/src/routes/pipeline.ts` | 파이프라인 라우트 5ep |
| `packages/api/src/routes/share-links.ts` | 공유 라우트 6ep |
| `packages/api/src/routes/notifications.ts` | 알림 라우트 2ep |
| `packages/api/src/routes/decisions.ts` | 의사결정 라우트 4ep |
| `packages/api/src/index.ts` | 라우트 등록 |
| `packages/api/src/__tests__/pipeline.test.ts` | 파이프라인 테스트 |
| `packages/api/src/__tests__/share-links.test.ts` | 공유 테스트 |
| `packages/api/src/__tests__/notifications.test.ts` | 알림 테스트 |
| `packages/api/src/__tests__/decisions.test.ts` | 의사결정 테스트 |

### Worker 3: Web 컴포넌트

| 파일 | 작업 |
|------|------|
| `packages/web/src/app/(app)/pipeline/page.tsx` | 파이프라인 페이지 |
| `packages/web/src/components/feature/pipeline/kanban-board.tsx` | 칸반 뷰 |
| `packages/web/src/components/feature/pipeline/pipeline-view.tsx` | 파이프라인 뷰 |
| `packages/web/src/components/feature/pipeline/item-card.tsx` | 아이템 카드 |
| `packages/web/src/components/feature/sharing/share-dialog.tsx` | 공유 다이얼로그 |
| `packages/web/src/components/feature/notifications/notification-list.tsx` | 알림 목록 |
| `packages/web/src/components/feature/decisions/decision-panel.tsx` | 의사결정 패널 |
| `packages/web/src/__tests__/pipeline.test.tsx` | 파이프라인 테스트 |
| `packages/web/src/__tests__/sharing.test.tsx` | 공유 테스트 |
| `packages/web/src/__tests__/decisions.test.tsx` | 의사결정 테스트 |

## 6. 성공 기준

| 기준 | 목표 |
|------|------|
| API 엔드포인트 | 15개 신규 |
| 테스트 통과 | ~90 tests all pass |
| typecheck | 0 errors |
| lint | 0 errors |
| D1 마이그레이션 | 0066~0069 적용 |
