---
code: FX-PLAN-S236
title: "Sprint 236 — F483 웹 평가결과서 뷰어"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-09
updated: 2026-04-09
author: Claude
---

# Sprint 236 Plan — F483 웹 평가결과서 뷰어

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F483 웹 평가결과서 뷰어 |
| REQ | FX-REQ-475 |
| Sprint | 236 |
| 우선순위 | P1 |
| 예상 파일 | ~10개 (API 4 + Web 3 + Migration 1 + Test 2) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Claude Code 스킬(F481)이 생성한 평가결과서 HTML을 Foundry-X 웹에서 조회할 방법이 없음 |
| Solution | Discovery 상세 페이지에 "평가결과서" 탭 추가 + HTML 저장/조회 API + 공유 링크 |
| Function UX Effect | 발굴 분석 완료 후 평가결과서를 즉시 열람·공유할 수 있어 BD 업무 연속성 확보 |
| Core Value | BD 산출물 가시성 — "Git에 있는데 웹에서 안 보임" 단절 해소 |

## 1. 배경

### 선행 작업 (완료)
- **F481** (Sprint 235): PRD-final → 9탭 HTML 평가결과서 자동 생성 스킬
- **F482** (Sprint 235): Claude Code 스킬 → API sync-artifacts 파이프라인

### 현재 문제
F481 스킬이 HTML 파일을 로컬에 생성하지만, Foundry-X DB에 저장하는 경로가 없어 웹에서 조회 불가. F482의 sync-artifacts는 텍스트 아티팩트를 동기화하지만, 완성된 HTML 평가결과서는 별도 저장이 필요.

## 2. 구현 범위

### 2-1. D1 마이그레이션 — report_html 컬럼 추가
- `ax_discovery_reports` 테이블에 `report_html TEXT` 컬럼 추가
- 기존 `report_json`(9탭 JSON)과 별도로, 최종 렌더링된 HTML을 저장

### 2-2. API 엔드포인트 (3개 추가)
| Method | Path | 용도 |
|--------|------|------|
| `PUT` | `/ax-bd/discovery-reports/:itemId/html` | HTML 저장 (스킬에서 호출) |
| `GET` | `/ax-bd/discovery-reports/:itemId/html` | HTML 조회 (웹에서 호출) |
| `GET` | `/ax-bd/discovery-reports/share/:token` | 공유 토큰으로 HTML 조회 (비인증) |

### 2-3. Web 컴포넌트
| 컴포넌트 | 역할 |
|----------|------|
| `EvaluationReportViewer.tsx` | iframe + srcdoc로 HTML 렌더링 (BusinessPlanViewer 패턴) |
| discovery-detail.tsx 수정 | "평가결과서" 탭 추가 (5번째 탭) |

### 2-4. API Client
- `fetchEvaluationReportHtml(itemId)` — HTML 문자열 반환
- `saveEvaluationReportHtml(itemId, html)` — HTML 저장
- `shareEvaluationReport(itemId)` — 공유 토큰 생성

## 3. 기술 설계

### 3-1. DB 스키마 변경
```sql
-- 0122_report_html.sql
ALTER TABLE ax_discovery_reports ADD COLUMN report_html TEXT;
```

### 3-2. API 설계
- HTML 저장: PUT body는 `{ html: string }` (Content-Type: application/json)
- HTML 조회: 200 OK → `{ data: { html: string, updatedAt: string } }`
- 공유 조회: 토큰 유효 시 HTML 직접 반환 (Content-Type: text/html)
- 기존 share API(`POST .../share`)로 토큰 생성 후, 새 GET 엔드포인트로 HTML 조회

### 3-3. Web 컴포넌트 설계
- `EvaluationReportViewer`: BusinessPlanViewer와 동일 패턴
  - iframe srcdoc + sandbox="allow-same-origin"
  - 자동 높이 조정 (onLoad)
  - "새 창에서 보기" + "공유 링크 복사" 버튼
  - loading/error/empty 3-state
- discovery-detail.tsx: TabsTrigger "평가결과서" 추가, lazy load

## 4. 수정 파일 목록

| # | 패키지 | 파일 | 변경 |
|---|--------|------|------|
| 1 | api | `src/db/migrations/0122_report_html.sql` | 신규: ALTER TABLE |
| 2 | api | `src/core/discovery/routes/discovery-reports.ts` | 수정: 3 엔드포인트 추가 |
| 3 | api | `src/core/discovery/services/discovery-report-service.ts` | 수정: HTML CRUD 메서드 추가 |
| 4 | api | `src/core/discovery/schemas/discovery-report-schema.ts` | 수정: HTML 스키마 추가 |
| 5 | web | `src/components/feature/discovery/EvaluationReportViewer.tsx` | 신규: HTML 뷰어 |
| 6 | web | `src/routes/ax-bd/discovery-detail.tsx` | 수정: 탭 추가 |
| 7 | web | `src/lib/api-client.ts` | 수정: 3 함수 추가 |
| 8 | api | `src/core/discovery/routes/__tests__/discovery-reports.test.ts` | 신규/수정: HTML API 테스트 |
| 9 | web | `src/components/feature/discovery/__tests__/EvaluationReportViewer.test.tsx` | 신규: 뷰어 테스트 |

## 5. 의존성

- F481 (✅ 완료): HTML 생성 스킬 — 이 스킬이 생성한 HTML을 API로 저장
- F482 (✅ 완료): sync-artifacts — 아티팩트 동기화 파이프라인 참고
- `ax_discovery_reports` 테이블: 기존 report_json + shared_token 활용
- BusinessPlanViewer 패턴: iframe srcdoc 렌더링 재사용

## 6. 테스트 전략

| 종류 | 대상 | 항목 |
|------|------|------|
| Unit | DiscoveryReportService | HTML 저장/조회/공유토큰 조회 |
| Integration | API 라우트 | PUT/GET html, GET share/:token |
| Component | EvaluationReportViewer | loading/렌더링/에러/empty state |
| Manual | discovery-detail | 탭 전환, iframe 렌더링, 공유 링크 복사 |

## 7. 리스크

| 리스크 | 대응 |
|--------|------|
| HTML 크기 (큰 보고서) | D1 TEXT 컬럼은 충분히 큼, R2 전환은 Phase 29 이후 검토 |
| XSS (HTML 인젝션) | iframe sandbox="allow-same-origin" 적용, 외부 스크립트 차단 |
| 공유 링크 보안 | shared_token은 랜덤 hex 32자, 추측 불가 |
