---
code: FX-PLAN-S157
title: Sprint 157 — 리포트 5탭 + 팀 검토 Handoff + 공유/PDF Export
version: "1.0"
status: Active
category: PLAN
created: 2026-04-05
updated: 2026-04-05
author: Sinclair
---

# Sprint 157 Plan — F348 + F349 + F350

## Executive Summary

| 항목 | 값 |
|------|-----|
| Sprint | 157 |
| Phase | 15 — Discovery UI/UX 고도화 v2 |
| F-items | F348 (리포트 5탭) + F349 (팀 검토 Handoff) + F350 (공유+PDF) |
| 선행 | F346+F347 (Sprint 156 ✅), F344+F345 (Sprint 155 ✅), F342+F343 (Sprint 154 ✅) |
| 예상 변경 | Web 15~20파일 + API 3~5파일 + Shared 2파일 + Tests 5~8파일 |

## 1. 목표

Sprint 156에서 구축한 9탭 리포트 프레임의 "Coming Soon" placeholder 5개(2-5~2-9)를 실제 컴포넌트로 교체하고, 팀 검토 Handoff UI와 리포트 공유/PDF Export 기능을 완성하여 Phase 15 Discovery UI/UX v2를 마무리한다.

## 2. F-item 상세

### F348: 리포트 탭 5종 완성 (P1)

| 탭 | 컴포넌트 | 핵심 시각화 |
|----|---------|------------|
| 2-5 | OpportunityScoringTab | ICE 매트릭스 + Go/No-Go 게이트 체크리스트 |
| 2-6 | CustomerPersonaTab | Persona 카드 + Customer Journey 플로우 |
| 2-7 | BusinessModelTab | BMC 완성 그리드(9블록) + Unit Economics |
| 2-8 | PackagingTab | GTM 전략 + Beachhead + Executive Summary |
| 2-9 | PersonaEvalResultTab | 종합 점수 카드 + Radar 차트 + 페르소나별 상세 |

**구현 패턴**: Sprint 156의 ReferenceAnalysisTab 패턴 답습
- `Props: { data: unknown }`
- `parseData()` 함수로 타입 변환
- `StepHeader` + `InsightBox` + `MetricCard` 공통 컴포넌트 활용
- discovery-report.tsx에서 lazy import + ComingSoon 교체

### F349: 팀 검토 & Handoff (P0)

| 컴포넌트 | 기능 |
|---------|------|
| TeamReviewPanel | Go/Hold/Drop 투표 + 코멘트 입력 + 결과 집계 |
| ExecutiveSummary | 2-1~2-9 핵심 자동 요약 (1-pager) |
| DecisionRecord | 최종 결정 + 사유 + 타임스탬프 |
| HandoffChecklist | 형상화 진입 조건 체크리스트 |

**API**: 기존 `team-reviews.ts` 라우트 활용 (Sprint 154에서 생성)
**추가 API**: GET/POST executive-summary, PUT decision-record

### F350: 리포트 공유 + PDF Export (P1)

| 기능 | 구현 |
|------|------|
| 공유 링크 | 기존 `share-links.ts` 라우트 확장 — discovery report 전용 타입 추가 |
| PDF Export | html2canvas + jsPDF 클라이언트 사이드 렌더링 |

## 3. 기술 결정

| 결정 | 선택 | 근거 |
|------|------|------|
| Radar 차트 (2-9) | Recharts | Sprint 155에서 설치 완료 |
| BMC 그리드 (2-7) | CSS Grid (3×3) | 외부 라이브러리 불필요, 커스텀 스타일링 용이 |
| PDF Export | html2canvas + jsPDF | 클라이언트 사이드, Workers 부하 없음 |
| 공유 링크 토큰 | 기존 share-links 서비스 | 이미 토큰 생성/만료 구현됨 |
| Executive Summary | API에서 report_json 기반 생성 | 프론트엔드 로직 최소화 |

## 4. 구현 순서

### Phase A: 리포트 탭 5종 (F348)
1. Shared 타입 정의 — 5탭 데이터 인터페이스 추가
2. OpportunityScoringTab + CustomerPersonaTab 구현
3. BusinessModelTab + PackagingTab 구현
4. PersonaEvalResultTab 구현 (Recharts Radar)
5. discovery-report.tsx에서 lazy import 교체

### Phase B: 팀 검토 Handoff (F349)
6. TeamReviewPanel 컴포넌트 (투표 UI + 결과 집계)
7. ExecutiveSummary + DecisionRecord 컴포넌트
8. HandoffChecklist 컴포넌트
9. discovery-report.tsx에 팀 검토 탭/섹션 통합
10. API: executive-summary 엔드포인트

### Phase C: 공유 + PDF (F350)
11. ShareReportButton 컴포넌트 (기존 share-links API 호출)
12. ExportPdfButton 컴포넌트 (html2canvas + jsPDF)
13. discovery-report.tsx 헤더에 공유/PDF 버튼 추가

### Phase D: 테스트 + 검증
14. API 테스트 (executive-summary, team-review 확장)
15. Web 컴포넌트 테스트 (5탭 + 팀 검토)

## 5. 변경 파일 매핑

### Web (packages/web)
| 파일 | 작업 |
|------|------|
| `src/components/feature/discovery/report/tabs/OpportunityScoringTab.tsx` | 신규 |
| `src/components/feature/discovery/report/tabs/CustomerPersonaTab.tsx` | 신규 |
| `src/components/feature/discovery/report/tabs/BusinessModelTab.tsx` | 신규 |
| `src/components/feature/discovery/report/tabs/PackagingTab.tsx` | 신규 |
| `src/components/feature/discovery/report/tabs/PersonaEvalResultTab.tsx` | 신규 |
| `src/components/feature/discovery/report/TeamReviewPanel.tsx` | 신규 |
| `src/components/feature/discovery/report/ExecutiveSummary.tsx` | 신규 |
| `src/components/feature/discovery/report/DecisionRecord.tsx` | 신규 |
| `src/components/feature/discovery/report/HandoffChecklist.tsx` | 신규 |
| `src/components/feature/discovery/report/ShareReportButton.tsx` | 신규 |
| `src/components/feature/discovery/report/ExportPdfButton.tsx` | 신규 |
| `src/routes/ax-bd/discovery-report.tsx` | 수정 — 5탭 lazy import + 팀 검토 + 공유/PDF |
| `src/lib/api-client.ts` | 수정 — executive-summary, team-review fetch 함수 |

### API (packages/api)
| 파일 | 작업 |
|------|------|
| `src/routes/executive-summary.ts` | 신규 |
| `src/services/executive-summary-service.ts` | 신규 |
| `src/schemas/executive-summary-schema.ts` | 신규 |
| `src/app.ts` | 수정 — executive-summary 라우트 등록 |

### Shared (packages/shared)
| 파일 | 작업 |
|------|------|
| `src/discovery-report.ts` | 수정 — 5탭 데이터 타입 추가 |
| `src/index.ts` | 수정 — export 추가 |

## 6. 리스크

| 리스크 | 완화 |
|--------|------|
| Recharts Radar SSR 오류 | lazy import + Suspense로 클라이언트 사이드만 렌더링 |
| jsPDF 번들 크기 | dynamic import로 필요 시에만 로딩 |
| 기존 share-links와 discovery report 공유 충돌 | 별도 shareType='discovery-report' 필드 활용 |
