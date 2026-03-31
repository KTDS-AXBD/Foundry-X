---
code: FX-RPRT-S88
title: "Sprint 88 — 팀 데이터 공유(Org-scope) + NPS 피드백 수집"
version: 1.0
status: Active
category: RPRT
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-PLAN-S88]], [[FX-DSGN-S88]]"
---

# Sprint 88 PDCA 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F253 팀 데이터 공유(Org-scope) + F254 NPS 피드백 수집 |
| Sprint | 88 |
| 시작 | 2026-03-31 |
| 종료 | 2026-03-31 |

| 항목 | 값 |
|------|-----|
| Match Rate | 96% |
| 신규 파일 | 12개 |
| 수정 파일 | 8개 |
| 테스트 추가 | 17개 (org-shared 8 + nps 9) |
| D1 마이그레이션 | 0075 (nps_surveys) |
| API 엔드포인트 추가 | 5개 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 같은 조직 내 팀원의 산출물(BMC, 인사이트)을 볼 수 없었고, NPS를 체계적으로 수집하지 못했어요 |
| Solution | Org-scope 공유 뷰 + 주간 NPS 서베이 자동 트리거 + 팀 NPS 대시보드 |
| Function UX Effect | 팀 공유 페이지에서 타 팀원 BMC/활동 즉시 확인 + 7일 주기 NPS 자동 팝업 |
| Core Value | 팀 협업 가시성 확보 + KPI K1(사용자 만족도) 측정 인프라 완성 |

## PDCA 사이클

### Plan
- F253: Org-scope 팀 BMC 목록 + 활동 피드 API + 웹 페이지
- F254: nps_surveys 테이블 + 7일 주기 서베이 + 팀 NPS 대시보드

### Do
- **API**: org-shared (schema + service + route), nps (schema + service + route), feedback surveyId 연동
- **DB**: 0075_nps_surveys.sql 마이그레이션
- **Web**: team-shared 페이지, NpsSurveyTrigger, NPS 대시보드, sidebar 메뉴
- **Test**: 17개 신규 테스트 전체 통과

### Check
- Gap 분석 Match Rate: **96%**
- 차이점: Design 문서 경로가 Next.js 컨벤션으로 작성되었으나 실제는 React Router 컨벤션 → Design 보정 완료
- 기능적 불일치: 없음

### Act
- Design 문서 파일 목록 보정 (3건 추가, 경로 수정)
- 추가 개선 가능: NPS 대시보드에 차트 라이브러리 도입 (현재 CSS-only bar)

## 변경 파일 목록

### 신규 (12개)
1. `packages/api/src/db/migrations/0075_nps_surveys.sql`
2. `packages/api/src/schemas/org-shared.ts`
3. `packages/api/src/schemas/nps.ts`
4. `packages/api/src/services/org-shared-service.ts`
5. `packages/api/src/services/nps-service.ts`
6. `packages/api/src/routes/org-shared.ts`
7. `packages/api/src/routes/nps.ts`
8. `packages/api/src/__tests__/org-shared-routes.test.ts`
9. `packages/api/src/__tests__/nps-routes.test.ts`
10. `packages/web/src/routes/team-shared.tsx`
11. `packages/web/src/routes/nps-dashboard.tsx`
12. `packages/web/src/components/feature/NpsSurveyTrigger.tsx`

### 수정 (8개)
1. `packages/api/src/app.ts` — route 등록 + OpenAPI tag
2. `packages/api/src/schemas/feedback.ts` — surveyId 추가
3. `packages/api/src/routes/feedback.ts` — NPS completeSurvey 연동
4. `packages/api/src/__tests__/helpers/mock-d1.ts` — nps_surveys + feedback 컬럼 추가
5. `packages/web/src/lib/api-client.ts` — 5 API 함수 + 3 interface
6. `packages/web/src/components/sidebar.tsx` — "팀 공유" 메뉴
7. `packages/web/src/layouts/AppLayout.tsx` — NpsSurveyTrigger 마운트
8. `packages/web/src/router.tsx` — team-shared, nps 라우트

## 테스트 결과

| Suite | Tests | Status |
|-------|-------|--------|
| OrgSharedService | 8 | PASS |
| NpsService | 9 | PASS |
| **합계** | **17** | **ALL PASS** |
