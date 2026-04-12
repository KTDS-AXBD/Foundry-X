# Sprint 156 Plan — 발굴 완료 리포트 9탭 프레임 + 4탭 선 구현

> **Summary**: F346(리포트 공통 컴포넌트 + 9탭 프레임 + 집계 API) + F347(ReferenceAnalysis~OpportunityIdeation 4탭)
>
> **Project**: Foundry-X
> **Sprint**: 156
> **Phase**: 15 — Discovery UI/UX 고도화 v2
> **Author**: Sinclair Seo
> **Date**: 2026-04-05
> **Status**: Draft
> **PRD**: `docs/specs/fx-discovery-ui-v2/prd-final.md`
> **Phase Plan**: `docs/01-plan/features/discovery-ui-v2.plan.md`

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | 발굴 2-1~2-9 단계 결과물이 개별 JSON으로만 존재하여 전체를 조망하는 시각화 리포트가 없음. 의사결정 시 수작업 PPT에 의존 |
| **Solution** | 5개 공통 컴포넌트(StepHeader, InsightBox, MetricCard, NextStepBox, HITL Badge) + 9탭 리포트 프레임 + 집계 API + 선 구현 4탭(2-1~2-4) |
| **Function/UX Effect** | discovery-detail 페이지에서 "리포트" 탭 클릭 → 9탭 구조로 2-1~2-9 결과가 자동 렌더링. TAM 도넛차트, Porter Radar, BMC 그리드 등 시각화 |
| **Core Value** | 발굴 결과물의 구조화된 시각화로 팀 공유·의사결정 기반 마련. Sprint 157(5탭+팀 검토) 진행 전제 |

---

## 1. Overview

### 1.1 Purpose

Sprint 156은 9탭 발굴 완료 리포트의 골격(프레임)과 선 구현 4탭을 만들어요:
- **F346**: 리포트 공통 컴포넌트 5종 + 9탭 프레임 + discovery-* 시맨틱 토큰 + GET /ax-bd/discovery-report/:itemId API
- **F347**: ReferenceAnalysisTab(2-1) + MarketValidationTab(2-2) + CompetitiveLandscapeTab(2-3) + OpportunityIdeationTab(2-4)

### 1.2 Dependencies

| 의존성 | 상태 | 대응 |
|--------|------|------|
| F342 DB 스키마 (Sprint 154) | 병렬 진행 중 | ax_discovery_reports, ax_persona_evals 테이블 필요. 154 merge 전이면 마이그레이션 포함 |
| recharts | 미설치 | Sprint 156에서 `pnpm add recharts` 실행 (TAM 도넛, Radar 차트 필요) |
| ax_discovery_outputs 데이터 | 기존 존재 | output_json 컬럼에서 탭별 데이터 추출 |

### 1.3 Related Documents

- Phase Plan: `docs/01-plan/features/discovery-ui-v2.plan.md` §Sprint 156
- PRD §8.3: 화면 3 — 발굴 완료 리포트 (9탭) 상세 설계
- 참고 HTML: `docs/specs/ax-descovery-plan/03_AX사업개발_발굴단계완료(안).html`

---

## 2. Scope

### 2.1 In Scope

**F346 — 리포트 공통 컴포넌트 + 프레임 (FX-REQ-338)**
- [ ] 공통 컴포넌트 5종: StepHeader, InsightBox, MetricCard, NextStepBox, HITL Badge
- [ ] discovery-* CSS 시맨틱 토큰 5색 (mint/blue/amber/red/purple)
- [ ] 9탭 리포트 프레임 (DiscoveryReportPage.tsx) — Lazy Loading
- [ ] GET /ax-bd/discovery-report/:itemId — 2-1~2-9 output_json 집계 API
- [ ] discovery-report 라우트 등록 (/discovery/items/:id/report)
- [ ] Zod 스키마: discoveryReportSchema

**F347 — 리포트 탭 4종 선 구현 (FX-REQ-339)**
- [ ] ReferenceAnalysisTab (2-1): 3-Layer 테이블 + JTBD 비교카드 + 경쟁 비교표
- [ ] MarketValidationTab (2-2): TAM/SAM/SOM 도넛차트 + Pain Point 맵 + ROI 표
- [ ] CompetitiveLandscapeTab (2-3): SWOT 4분면 + Porter Radar 차트 + 포지셔닝맵
- [ ] OpportunityIdeationTab (2-4): HMW 카드 + BMC 그리드(9블록) + Phase 타임라인

### 2.2 Out of Scope

- 2-5~2-9 탭 구현 → Sprint 157 F348
- 팀 검토(Go/Hold/Drop) → Sprint 157 F349
- PDF Export, 공유 링크 → Sprint 157 F350
- 멀티 페르소나 평가 UI/엔진 → Sprint 155 F344+F345

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | F-item |
|----|-------------|----------|--------|
| FR-13 | StepHeader: 탭 제목 + 단계 번호 + 색상 코딩 | P0 | F346 |
| FR-13b | InsightBox: AI 인사이트 카드 (아이콘 + 텍스트 + 접기/펼치기) | P0 | F346 |
| FR-13c | MetricCard: 숫자 + 라벨 + 트렌드 표시 카드 | P0 | F346 |
| FR-13d | NextStepBox: 다음 단계 안내 CTA 카드 | P0 | F346 |
| FR-13e | HITL Badge: Human-in-the-Loop 라벨 배지 | P0 | F346 |
| FR-14 | 9탭 프레임: 탭 전환 + Lazy Loading + 시맨틱 토큰 색상 | P0 | F346 |
| FR-15 | GET /ax-bd/discovery-report/:itemId: output_json 집계 + 정규화 | P0 | F346 |
| FR-16a | ReferenceAnalysisTab: 3-Layer 테이블 + JTBD 비교 + 경쟁 비교 | P0 | F347 |
| FR-16b | MarketValidationTab: TAM/SAM/SOM PieChart + Pain Point 맵 | P0 | F347 |
| FR-16c | CompetitiveLandscapeTab: SWOT 4분면 + RadarChart + 포지셔닝맵 | P0 | F347 |
| FR-16d | OpportunityIdeationTab: HMW 카드 + BMC 9블록 그리드 + 타임라인 | P0 | F347 |

### 3.2 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| Performance | 9탭 리포트 초기 로딩 < 3초 (Lazy Loading: 활성 탭만 렌더) |
| Compatibility | AXIS DS 토큰 체계 준수 + discovery-* 확장 토큰 |
| Accessibility | 모바일 360px 최소 지원 (반응형 그리드) |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [ ] 공통 컴포넌트 5종 렌더링 + 단위 테스트
- [ ] 9탭 프레임에서 탭 전환 동작 (Lazy Loading)
- [ ] GET /ax-bd/discovery-report/:itemId API 응답 정상
- [ ] 4탭 각각 데모 데이터로 렌더링 성공
- [ ] typecheck + lint 0 error
- [ ] Gap Analysis Match Rate ≥ 90%

### 4.2 Quality Criteria

- [ ] 신규 API 라우트 Zod 스키마 적용
- [ ] 기존 discovery 라우트 회귀 없음

---

## 5. Implementation Order

| 순서 | 작업 | 파일 | 테스트 | 예상 |
|------|------|------|--------|------|
| 1 | DB 마이그레이션 (154 미merge 시) | `packages/api/src/db/migrations/0098_discovery_reports.sql` | 스키마 검증 | 10분 |
| 2 | DiscoveryReportService + Zod | `packages/api/src/services/discovery-report-service.ts`, `schemas/discovery-report.ts` | CRUD 테스트 | 20분 |
| 3 | GET /ax-bd/discovery-report/:itemId | `packages/api/src/routes/discovery-report.ts` | API 테스트 | 15분 |
| 4 | recharts 설치 | `packages/web/package.json` | — | 2분 |
| 5 | discovery-* CSS 시맨틱 토큰 | `packages/web/src/styles/discovery-tokens.css` | — | 5분 |
| 6 | 공통 컴포넌트 5종 | `packages/web/src/components/feature/discovery/report/` | 각 컴포넌트 | 30분 |
| 7 | 9탭 리포트 프레임 | `packages/web/src/routes/ax-bd/discovery-report.tsx` | 탭 전환 | 20분 |
| 8 | 라우트 등록 | `packages/web/src/router.tsx` | — | 2분 |
| 9 | ReferenceAnalysisTab (2-1) | `report/tabs/ReferenceAnalysisTab.tsx` | 렌더 | 25분 |
| 10 | MarketValidationTab (2-2) | `report/tabs/MarketValidationTab.tsx` | TAM 차트 | 30분 |
| 11 | CompetitiveLandscapeTab (2-3) | `report/tabs/CompetitiveLandscapeTab.tsx` | Radar 차트 | 30분 |
| 12 | OpportunityIdeationTab (2-4) | `report/tabs/OpportunityIdeationTab.tsx` | BMC 그리드 | 25분 |

---

## 6. Architecture

### 6.1 File Structure

```
packages/
├── api/src/
│   ├── db/migrations/
│   │   └── 0098_discovery_reports.sql    # (154 미merge 시)
│   ├── routes/
│   │   └── discovery-report.ts           # GET /ax-bd/discovery-report/:itemId
│   ├── services/
│   │   └── discovery-report-service.ts   # output_json 집계 로직
│   └── schemas/
│       └── discovery-report.ts           # Zod 스키마
├── web/src/
│   ├── styles/
│   │   └── discovery-tokens.css          # --discovery-mint/blue/amber/red/purple
│   ├── components/feature/discovery/report/
│   │   ├── StepHeader.tsx
│   │   ├── InsightBox.tsx
│   │   ├── MetricCard.tsx
│   │   ├── NextStepBox.tsx
│   │   ├── HITLBadge.tsx
│   │   └── tabs/
│   │       ├── ReferenceAnalysisTab.tsx   # 2-1
│   │       ├── MarketValidationTab.tsx    # 2-2
│   │       ├── CompetitiveLandscapeTab.tsx # 2-3
│   │       └── OpportunityIdeationTab.tsx # 2-4
│   ├── routes/ax-bd/
│   │   └── discovery-report.tsx          # 9탭 프레임 페이지
│   └── router.tsx                        # 라우트 등록
└── shared/src/types/
    └── discovery-report.ts               # 공유 타입 (탭 데이터 인터페이스)
```

### 6.2 Data Flow

```
biz_item_discovery_stages (기존)
  ↓ stage별 output_json 조회
GET /ax-bd/discovery-report/:itemId
  ↓ JSON 응답 (9탭 데이터 구조)
DiscoveryReportPage (9탭 프레임)
  ↓ Lazy Loading
ReferenceAnalysisTab / MarketValidationTab / ...
  ↓ Recharts (PieChart, RadarChart)
시각화 렌더링
```

### 6.3 탭별 데이터 구조

```typescript
interface DiscoveryReportData {
  itemId: string;
  title: string;
  type: 'I' | 'M' | 'P' | 'T' | 'S';
  tabs: {
    '2-1'?: ReferenceAnalysisData;   // 3-Layer + JTBD + 경쟁
    '2-2'?: MarketValidationData;     // TAM/SAM/SOM + Pain Point
    '2-3'?: CompetitiveLandscapeData; // SWOT + Porter + 포지셔닝
    '2-4'?: OpportunityIdeationData;  // HMW + BMC + 타임라인
    '2-5'?: unknown; // Sprint 157
    '2-6'?: unknown;
    '2-7'?: unknown;
    '2-8'?: unknown;
    '2-9'?: unknown;
  };
  completedStages: string[];
  overallProgress: number;
}
```

---

## 7. Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| output_json 비정형 → 탭 렌더 실패 | High | fallback UI 표시 ("데이터 없음"), 타입 가드로 안전 파싱 |
| recharts 번들 크기 | Medium | tree-shaking (PieChart, RadarChart만 import) |
| Sprint 154 미merge → DB 테이블 부재 | Medium | 필요한 마이그레이션만 이 Sprint에 포함 |
| 4탭 시각화 복잡도 | Medium | 기본 레이아웃 우선 + 차트는 점진 추가 |

---

## 8. Worker 파일 매핑

### Worker 1: API (Backend)
**수정 허용 파일:**
- `packages/api/src/db/migrations/0098_discovery_reports.sql`
- `packages/api/src/services/discovery-report-service.ts`
- `packages/api/src/schemas/discovery-report.ts`
- `packages/api/src/routes/discovery-report.ts`
- `packages/api/src/__tests__/discovery-report.test.ts`

### Worker 2: Web (Frontend)
**수정 허용 파일:**
- `packages/web/src/styles/discovery-tokens.css`
- `packages/web/src/components/feature/discovery/report/*.tsx`
- `packages/web/src/components/feature/discovery/report/tabs/*.tsx`
- `packages/web/src/routes/ax-bd/discovery-report.tsx`
- `packages/web/src/router.tsx`
- `packages/web/package.json` (recharts 추가)
- `packages/shared/src/types/discovery-report.ts`
