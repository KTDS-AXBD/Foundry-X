---
title: Sprint 223 — 포트폴리오 연결 구조 검색 + 대시보드 (F459~F460)
version: 1.0
status: active
phase: Phase 26-D
f_items: F459, F460
sprint: 223
created: 2026-04-08
---

# Sprint 223: 포트폴리오 연결 구조 검색 + 대시보드

## 1. 목적

사업아이템→분석→평가결과서→사업기획서/Offering→PRD→Prototype 전체 연결 구조를
단일 API로 조회하고, 대시보드에서 시각화하는 기능 구현.

현재 각 산출물(evaluation, PRD, business_plan, offering, prototype)이 별도 엔드포인트로
분산되어 있어, 전체 포트폴리오를 한눈에 볼 수 없음.

## 2. 범위

### F459: 포트폴리오 연결 구조 검색 API

| # | 기능 | 설명 |
|---|------|------|
| 1 | **Portfolio Graph API** | `GET /portfolio/:bizItemId/graph` — 단일 아이템의 전체 연결 그래프 반환 |
| 2 | **Portfolio List API** | `GET /portfolio` — 전체 아이템 목록 + 산출물 커버리지 요약 |
| 3 | **Reverse Lookup** | `GET /portfolio/by-artifact?type=prd&id=xxx` — 산출물→아이템 역조회 |

### F460: 포트폴리오 대시보드

| # | 기능 | 설명 |
|---|------|------|
| 1 | **포트폴리오 목록** | 아이템 카드 목록 + 파이프라인 진행률 + 산출물 아이콘 |
| 2 | **연결 그래프 시각화** | 아이템 클릭 → 전체 산출물 연결 트리/타임라인 표시 |
| 3 | **산출물 미리보기** | PRD/사업기획서/Offering/Prototype 인라인 미리보기 |
| 4 | **편집 링크** | 각 산출물 편집 페이지로 이동 링크 |

## 3. 기술 설계

### 3.1 Portfolio Graph API 응답 구조

```typescript
interface PortfolioGraph {
  bizItem: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
  };
  pipeline: {
    currentStage: string;
    stages: Array<{ stage: string; enteredAt: string; exitedAt?: string }>;
  };
  classification?: { itemType: string; confidence: number };
  startingPoint?: { startingPoint: string; confidence: number };
  evaluation?: {
    verdict: string;
    avgScore: number;
    evaluatedAt: string;
  };
  prds: Array<{ id: string; version: number; generatedAt: string }>;
  businessPlans: Array<{ id: string; version: number; generatedAt: string }>;
  offerings: Array<{
    id: string;
    title: string;
    purpose: string;
    status: string;
    prototypes: Array<{ id: string; version: number }>;
  }>;
  prototypes: Array<{ id: string; version: number; format: string; generatedAt: string }>;
  files: Array<{ id: string; filename: string; mimeType: string; status: string }>;
}
```

### 3.2 Portfolio List API 응답 구조

```typescript
interface PortfolioListItem {
  bizItemId: string;
  title: string;
  status: string;
  currentStage: string;
  coverage: {
    hasEvaluation: boolean;
    prdCount: number;
    businessPlanCount: number;
    offeringCount: number;
    prototypeCount: number;
    fileCount: number;
  };
  latestActivity: string; // ISO timestamp
}
```

### 3.3 구현 파일

| 파일 | 역할 |
|------|------|
| `packages/api/src/core/discovery/routes/portfolio.ts` | Portfolio API 라우트 (신규) |
| `packages/api/src/core/discovery/services/portfolio-service.ts` | 집계 서비스 (신규) |
| `packages/api/src/core/discovery/schemas/portfolio.ts` | Zod 스키마 (신규) |
| `packages/web/src/routes/portfolio.tsx` | 대시보드 페이지 (신규) |
| `packages/web/src/components/portfolio/` | 컴포넌트 (신규) |

### 3.4 기존 코드 활용

- `BizItemService.getById()` — 아이템 기본 정보
- `pipeline_stages` 테이블 — 라이프사이클 이력
- `biz_evaluations` — 평가 결과
- `biz_generated_prds` — PRD 버전
- `business_plan_drafts` — 사업기획서
- `offerings` + `offering_prototypes` — Offering + Prototype 연결
- `uploaded_files` — 첨부 파일

## 4. 구현 순서

```
1. Portfolio Service (API)
   ├── getGraph(orgId, bizItemId) — 단일 아이템 전체 그래프
   ├── list(orgId) — 전체 목록 + 커버리지
   └── findByArtifact(orgId, type, id) — 역조회

2. Portfolio Routes (API)
   ├── GET /portfolio — 목록
   ├── GET /portfolio/:bizItemId/graph — 그래프
   └── GET /portfolio/by-artifact — 역조회

3. Portfolio Dashboard (Web)
   ├── PortfolioPage — 메인 레이아웃
   ├── PortfolioCard — 아이템 카드
   ├── PortfolioGraph — 연결 시각화
   └── ArtifactPreview — 산출물 미리보기

4. 테스트
   ├── portfolio-service.test.ts
   ├── portfolio-routes.test.ts
   └── e2e/portfolio.spec.ts
```

## 5. 성공 기준

- [ ] `GET /portfolio` — 4건 아이템 목록 + coverage 정상 반환
- [ ] `GET /portfolio/:id/graph` — 전체 연결 그래프 1초 이내 반환
- [ ] `GET /portfolio/by-artifact` — 역조회 정상 동작
- [ ] 대시보드 페이지에서 4건 아이템 카드 표시
- [ ] 아이템 클릭 → 연결 그래프 시각화
- [ ] PRD/사업기획서/Offering 미리보기 동작
- [ ] 테스트 커버리지 (unit + API)

## 6. 리스크

| 리스크 | 대응 |
|--------|------|
| 대용량 HTML(Deny 3.6MB) R2 조회 시 지연 | 미리보기는 요약만 표시, 전체 조회는 별도 페이지 |
| 다중 테이블 JOIN 성능 | 서비스 레이어에서 개별 쿼리 후 메모리 합성 (D1 복잡 JOIN 제한) |
| R2 콘텐츠 vs D1 content 혼재 | `[R2:key]` 접두사 파싱으로 통일 처리 |

## 7. Sprint WT 실행 계획

```
bash -i -c "sprint 223"
```

- WT에서 API + Web 동시 작업
- autopilot: Plan → Design → Implement → Analyze → Report
