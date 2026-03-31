---
code: FX-PLAN-S88
title: "Sprint 88 — 팀 데이터 공유(Org-scope) + NPS 피드백 수집"
version: 1.0
status: Draft
category: PLAN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-SPEC-001]]"
---

# Sprint 88: 팀 데이터 공유(Org-scope) + NPS 피드백 수집

## 목표

Org 단위 팀 데이터 공유 뷰와 주간 NPS 서베이 자동 트리거를 추가하여, 팀 협업 + KPI 측정 기반을 완성해요.

## F-Items

| F-Item | 제목 | 우선순위 | 비고 |
|--------|------|---------|------|
| F253 | 팀 데이터 공유 — Org-scope 공유 뷰 | P0 | F197~F204 BMC + F201 인사이트 기반 |
| F254 | 팀 피드백 수집 + NPS | P1 | F174 기반, KPI K1 측정 |

## 실행 계획

### F253: 팀 데이터 공유 — Org-scope 공유 뷰

현재 BMC/인사이트/Discovery 산출물은 `org_id` 기준으로 이미 격리되어 있지만, 같은 Org 내 다른 멤버의 산출물을 "팀 전체 뷰"로 모아보는 기능이 없어요. Org-scope 공유 뷰를 추가해요.

#### Step 1: Org-scope 팀 데이터 공유 API (~15분)

1. `packages/api/src/schemas/org-shared.ts` — 공유 데이터 응답 스키마
   - `OrgSharedDataResponseSchema`: bmcs[], insights[], discoveries[] + 작성자 정보
   - `OrgActivityFeedSchema`: 타임라인 피드 (최근 활동)
2. `packages/api/src/services/org-shared-service.ts` — `OrgSharedService`
   - `getSharedBmcs(orgId, opts)`: org_id 기준 전체 BMC 조회 (작성자 포함)
   - `getSharedInsights(orgId, opts)`: org_id 기준 인사이트 목록
   - `getActivityFeed(orgId, limit)`: org 내 최근 활동 타임라인 (BMC 생성/수정, 인사이트 생성 등)
3. `packages/api/src/routes/org-shared.ts` — 라우트
   - `GET /orgs/:orgId/shared/bmcs` — 팀 전체 BMC 목록 (tenantGuard)
   - `GET /orgs/:orgId/shared/insights` — 팀 전체 인사이트 목록
   - `GET /orgs/:orgId/shared/activity` — 팀 활동 피드
4. `packages/api/src/index.ts` — 라우트 등록

#### Step 2: 웹 팀 공유 페이지 (~20분)

1. `packages/web/src/app/(app)/team-shared/page.tsx` — 팀 공유 대시보드
   - 탭: BMC / 인사이트 / 활동 피드
   - 카드 형태로 산출물 표시, 작성자 아바타 + 이름
   - 활동 피드는 타임라인 UI
2. `packages/web/src/lib/api-client.ts` — API 함수 추가
   - `getOrgSharedBmcs(orgId)`, `getOrgSharedInsights(orgId)`, `getOrgActivityFeed(orgId)`
3. `packages/web/src/app/(app)/layout.tsx` — 사이드바에 "팀 공유" 메뉴 추가

#### Step 3: 테스트 (~10분)

1. `packages/api/src/__tests__/org-shared-routes.test.ts`
   - 같은 org 멤버의 BMC가 모두 조회되는지
   - 다른 org 데이터는 조회 불가
   - activity feed 정렬 (최신순)
   - 비멤버 403

### F254: 팀 피드백 수집 + NPS

기존 F174 피드백 위젯을 확장하여 주간 NPS 서베이 자동 트리거 + 팀별 집계 대시보드를 추가해요.

#### Step 4: NPS 서베이 스케줄 + 팀 집계 API (~15분)

1. D1 마이그레이션 `0075_nps_surveys.sql`
   - `nps_surveys` 테이블: id, org_id, user_id, triggered_at, completed_at, dismissed_at
   - 중복 방지: 같은 user에 7일 내 재트리거 불가
2. `packages/api/src/schemas/nps.ts` — NPS 전용 스키마
   - `NpsSurveyCheckResponseSchema`: shouldShow, surveyId
   - `NpsOrgSummaryResponseSchema`: 팀별 NPS 집계 (averageNps, responseRate, trend)
3. `packages/api/src/services/nps-service.ts` — `NpsService`
   - `checkSurveyEligibility(orgId, userId)`: 7일 간격 체크, 서베이 레코드 생성
   - `dismissSurvey(surveyId)`: dismissed_at 기록
   - `getOrgNpsSummary(orgId)`: 팀 NPS 집계 (30일 평균, 응답률, 주간 트렌드)
4. `packages/api/src/routes/nps.ts` — 라우트
   - `GET /nps/check` — 서베이 표시 여부 확인
   - `POST /nps/dismiss` — 서베이 닫기
   - `GET /orgs/:orgId/nps/summary` — 팀 NPS 집계 (tenantGuard, admin+)

#### Step 5: 프론트엔드 NPS 트리거 + 대시보드 (~15분)

1. `packages/web/src/components/feature/NpsSurveyTrigger.tsx`
   - 앱 로드 시 `GET /nps/check` 호출 → shouldShow면 FeedbackWidget을 NPS 모드로 자동 오픈
   - 닫기 시 `POST /nps/dismiss` 호출
   - 대시보드 레이아웃에 마운트
2. `packages/web/src/app/(app)/settings/nps-dashboard.tsx` — NPS 대시보드
   - 팀 NPS 평균, 응답률, 주간 트렌드 차트 (간단 bar)
   - 최근 피드백 목록
3. `packages/web/src/lib/api-client.ts` — API 함수 추가
   - `checkNpsSurvey()`, `dismissNpsSurvey(surveyId)`, `getOrgNpsSummary(orgId)`

#### Step 6: 테스트 (~10분)

1. `packages/api/src/__tests__/nps-routes.test.ts`
   - 7일 간격 체크 로직
   - 중복 서베이 방지
   - 팀 NPS 집계 정확성
   - dismiss 동작
2. `packages/web/src/__tests__/NpsSurveyTrigger.test.tsx`
   - shouldShow=true일 때 위젯 표시
   - shouldShow=false일 때 미표시

## 의존성

- F253: BMC 서비스(bmc-service.ts), 인사이트 서비스, tenantGuard 미들웨어
- F254: 기존 feedback 라우트/서비스/스키마, FeedbackWidget.tsx

## 예상 시간

| 구간 | 예상 |
|------|------|
| F253 API + Web + Test | ~45분 |
| F254 API + Web + Test | ~40분 |
| 검증 + 마무리 | ~15분 |
| **합계** | **~100분** |
