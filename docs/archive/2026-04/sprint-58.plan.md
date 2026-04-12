---
code: FX-PLAN-058
title: "Sprint 58 — F180 사업계획서 초안 자동 생성 + F181 Prototype 자동 생성"
version: 1.0
status: Active
category: PLAN
created: 2026-03-25
updated: 2026-03-25
author: Sinclair Seo (AI-assisted)
sprint: 58
features: [F180, F181]
req: [FX-REQ-180, FX-REQ-181]
---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | Discovery 2단계(발굴) 완료 후 사업계획서와 Prototype을 수작업으로 작성하는 데 2~5일 소요되며, 분석 결과가 충분히 반영되지 않는 정보 손실 발생 |
| **Solution** | Discovery 파이프라인(F175~F190) 결과를 종합하여 B2B 사업계획서 초안을 자동 생성하고, PRD 기반 데모 Prototype을 자동 생성하는 API + Web UI 구현 |
| **Function UX Effect** | 사업 아이템 상세 → "사업계획서 생성" 클릭 → 10초 내 10개 섹션 사업계획서 초안 제공 → "Prototype 생성" 클릭 → HTML 기반 데모 페이지 자동 생성 |
| **Core Value** | 형상화(3단계) 리드타임 80% 단축 + Discovery 분석 결과 100% 반영으로 정보 손실 제거 |

| 항목 | 값 |
|------|-----|
| Feature | F180 사업계획서 초안 + F181 Prototype 자동 생성 |
| Sprint | 58 |
| 예상 산출물 | 2 services, 2 templates, 1 route 확장, 2 D1 migrations, 4+ endpoints, 2 schemas, 2 shared types, 2 Web 컴포넌트 |

---

## 1. 배경 및 목표

### 1.1 AX-Discovery-Process 3단계 "형상화"

AX-Discovery-Process v0.8 (FX-SPEC-BDP-001)의 6단계 중 **3단계 형상화**를 자동화해요:

```
1단계 수집 → 2단계 발굴 → [3단계 형상화] → 4단계 검증공유 → 5단계 제품화 → 6단계 GTM
                              ↑ Sprint 58 범위
```

3단계 서브스텝:
- **3-1. 사업계획서 초안 생성** → **F180** (이번 Sprint)
- 3-2. 사업계획서 작성 (사람 편집) → 향후
- **3-3. PRD 생성** → F185 (Sprint 53, ✅ 완료)
- **3-4. Prototype 생성** → **F181** (이번 Sprint)

### 1.2 목표

1. **F180**: Discovery 파이프라인 결과(분류/평가/9기준/분석컨텍스트/트렌드)를 종합하여 B2B 사업계획서 초안 Markdown을 자동 생성
2. **F181**: PRD + 사업계획서 기반으로 사업 아이템 데모 Prototype HTML을 자동 생성

### 1.3 선행 완료 확인

| Feature | 설명 | 상태 |
|---------|------|------|
| F175 | 사업 아이템 3유형 분류 | ✅ |
| F178 | 8페르소나 × 8축 평가 | ✅ |
| F182 | 5시작점 분류 | ✅ |
| F183 | Discovery 9기준 체크리스트 | ✅ |
| F184 | HITL 분석 파이프라인 | ✅ |
| F185 | PRD 자동 생성 | ✅ |
| F186 | 다중 AI PRD 검토 | ✅ |
| F187 | 멀티 페르소나 PRD 평가 | ✅ |
| F190 | 시장/트렌드 데이터 연동 | ✅ |

---

## 2. F180 — 사업계획서 초안 자동 생성

### 2.1 개요

Discovery 파이프라인 전체 결과를 **10개 섹션** B2B 사업계획서 구조로 매핑해요.
PRD(F185)가 제품 중심이라면, 사업계획서는 **사업성·시장·재무·실행** 중심이에요.

### 2.2 사업계획서 섹션 구조

```
1.  요약 (Executive Summary)          ← 전체 종합
2.  사업 개요 (Business Overview)      ← BizItem 메타 + Classification
3.  문제 정의 및 기회                   ← Criterion 1 (문제/고객) + TrendReport
4.  솔루션 및 가치 제안                 ← Criterion 4 (가치제안) + PRD Section 6
5.  시장 분석                          ← Criterion 2 (시장기회) + TrendReport (TAM/SAM/SOM, 경쟁사)
6.  경쟁 환경 및 차별화                 ← Criterion 3,8 (경쟁/차별화) + Evaluation scores
7.  사업 모델 (Revenue Model)          ← Criterion 5 (수익구조)
8.  실행 계획 (Go-to-Market)           ← Criterion 9 (검증계획) + StartingPoint path
9.  리스크 및 대응 전략                 ← Criterion 6,7 (리스크/규제) + Persona concerns
10. 부록 — 평가 결과 요약              ← Evaluation verdict + scores + AI Review summary
```

### 2.3 데이터 소스 매핑

| 섹션 | 데이터 소스 | 서비스 |
|------|------------|--------|
| 1. 요약 | 전체 | LLM 종합 |
| 2. 사업 개요 | BizItem, Classification | `BizItemService` |
| 3. 문제/기회 | Criterion 1, TrendReport | `DiscoveryCriteriaService`, `BizItemService.getTrendReport()` |
| 4. 솔루션/가치 | Criterion 4, PRD | `DiscoveryCriteriaService`, `PrdGeneratorService` |
| 5. 시장 분석 | Criterion 2, TrendReport | `DiscoveryCriteriaService`, `BizItemService.getTrendReport()` |
| 6. 경쟁/차별화 | Criterion 3,8, EvaluationScores | `DiscoveryCriteriaService`, `BizItemService.getEvaluation()` |
| 7. 사업 모델 | Criterion 5 | `DiscoveryCriteriaService` |
| 8. 실행 계획 | Criterion 9, StartingPoint | `DiscoveryCriteriaService`, `BizItemService.getStartingPoint()` |
| 9. 리스크 | Criterion 6,7, Persona concerns | `DiscoveryCriteriaService`, `BizItemService.getEvaluation()` |
| 10. 부록 | Evaluation, PrdReview | `BizItemService`, `PrdReviewPipelineService` |

### 2.4 API 설계

```
POST /api/biz-items/:id/generate-business-plan
  Body: { skipLlmRefine?: boolean }
  Response: 201 { id, bizItemId, version, content, sectionsSnapshot, generatedAt }

GET  /api/biz-items/:id/business-plan
  Response: 200 { id, bizItemId, version, content, sectionsSnapshot, generatedAt }
  (최신 버전 반환)

GET  /api/biz-items/:id/business-plan/versions
  Response: 200 { versions: [{ version, generatedAt }] }
```

### 2.5 D1 스키마

```sql
-- 0042_business_plan_drafts.sql
CREATE TABLE IF NOT EXISTS business_plan_drafts (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  version INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  sections_snapshot TEXT,        -- JSON: 섹션별 매핑 메타데이터
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  generated_at TEXT NOT NULL,
  UNIQUE(biz_item_id, version)
);
```

### 2.6 서비스 구조

```
packages/api/src/services/
├── business-plan-generator.ts     # BusinessPlanGeneratorService (NEW)
├── business-plan-template.ts      # 10섹션 매핑 + Markdown 렌더링 (NEW)
├── prd-generator.ts               # 참고 패턴 (F185)
└── prd-template.ts                # 참고 패턴 (F185)
```

**BusinessPlanGeneratorService** 핵심 흐름:
1. `BizItemService`에서 item + classification + evaluation + startingPoint + trendReport 조회
2. `DiscoveryCriteriaService`에서 9기준 조회
3. `AnalysisContextService`에서 분석 컨텍스트 조회
4. `PrdGeneratorService`에서 최신 PRD 조회 (선택)
5. `business-plan-template.ts`로 10섹션 매핑 → Markdown 생성
6. LLM refinement (skipLlmRefine=false일 때)
7. D1 저장 + 버전 관리

---

## 3. F181 — Prototype 자동 생성

### 3.1 개요

사업 아이템의 **데모 가능한 프로토타입 HTML**을 자동 생성해요.
실제 제품이 아니라, **발표/공유용 데모 페이지** — 문제·솔루션·가치를 시각적으로 전달하는 1페이지 랜딩이에요.

### 3.2 Prototype 구조

```
[Hero Section]
  ├─ 사업 아이템 제목
  ├─ 핵심 가치 제안 (1줄)
  └─ CTA 버튼 (데모용)

[Problem Section]
  ├─ As-Is 문제 상황
  └─ 데이터/통계 (TrendReport 기반)

[Solution Section]
  ├─ 솔루션 개요
  ├─ 3가지 핵심 기능 카드
  └─ 아이콘/일러스트 (CSS 기반)

[Market Section]
  ├─ TAM/SAM/SOM (TrendReport)
  └─ 경쟁 차별화 포인트

[Social Proof Section]
  ├─ 평가 결과 요약 (평균 점수, 등급)
  └─ 페르소나 인용 (긍정 피드백)

[CTA Section]
  └─ 다음 단계 안내
```

### 3.3 디자인 접근

- **Self-contained HTML**: 외부 의존성 없이 단일 HTML 파일로 생성 (inline CSS + SVG)
- **5가지 템플릿**: Starting Point별 강조점 차별화
  - `idea` → 솔루션/가치 제안 중심
  - `market` → 시장 기회/규모 중심
  - `problem` → 문제 심각성/임팩트 중심
  - `tech` → 기술 혁신/차별화 중심
  - `service` → 기존 서비스 확장/시너지 중심
- **Color Scheme**: verdict(Green/Keep/Red)에 따른 톤 변화

### 3.4 API 설계

```
POST /api/biz-items/:id/generate-prototype
  Body: { template?: StartingPointType }  // 미지정 시 자동 선택
  Response: 201 { id, bizItemId, version, format, content, templateUsed, generatedAt }

GET  /api/biz-items/:id/prototype
  Response: 200 { id, bizItemId, version, format, content, templateUsed, generatedAt }

GET  /api/biz-items/:id/prototype/preview
  Response: 200 (text/html) — 직접 렌더링 가능한 HTML
```

### 3.5 D1 스키마

```sql
-- 0043_prototypes.sql
CREATE TABLE IF NOT EXISTS prototypes (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  version INTEGER NOT NULL DEFAULT 1,
  format TEXT NOT NULL DEFAULT 'html',   -- 'html' | 'markdown'
  content TEXT NOT NULL,
  template_used TEXT,                     -- starting point type
  model_used TEXT,
  tokens_used INTEGER DEFAULT 0,
  generated_at TEXT NOT NULL,
  UNIQUE(biz_item_id, version)
);
```

### 3.6 서비스 구조

```
packages/api/src/services/
├── prototype-generator.ts          # PrototypeGeneratorService (NEW)
├── prototype-templates.ts          # 5 Starting Point 템플릿 (NEW)
└── prototype-styles.ts             # CSS + SVG 인라인 스타일 (NEW)
```

**PrototypeGeneratorService** 핵심 흐름:
1. `BizItemService`에서 item + classification + evaluation + startingPoint + trendReport 조회
2. `PrdGeneratorService`에서 최신 PRD 조회
3. `BusinessPlanGeneratorService`에서 최신 사업계획서 조회 (있으면)
4. Starting Point 기반 템플릿 선택
5. 데이터를 섹션별로 매핑 → HTML 렌더링
6. LLM refinement (카피라이팅 개선, optional)
7. D1 저장 + 버전 관리

---

## 4. 구현 계획

### 4.1 구현 순서

```
Phase A: F180 사업계획서 (선행)
  A1. D1 migration 0042 (business_plan_drafts)
  A2. business-plan-template.ts (10섹션 매핑 + Markdown)
  A3. business-plan-generator.ts (서비스)
  A4. Zod schema (business-plan.ts)
  A5. biz-items route 확장 (3 endpoints)
  A6. Shared types (BusinessPlanDraft)
  A7. Tests (service + route)

Phase B: F181 Prototype (후행 — F180 결과 참조)
  B1. D1 migration 0043 (prototypes)
  B2. prototype-styles.ts (CSS + SVG)
  B3. prototype-templates.ts (5 templates)
  B4. prototype-generator.ts (서비스)
  B5. Zod schema (prototype.ts)
  B6. biz-items route 확장 (3 endpoints)
  B7. Shared types (Prototype)
  B8. Tests (service + route)

Phase C: Web 통합
  C1. BusinessPlanViewer 컴포넌트
  C2. PrototypePreview 컴포넌트
  C3. BizItem 상세 페이지에 탭 추가
```

### 4.2 예상 산출물

| 구분 | 파일 | 수량 |
|------|------|------|
| Services | business-plan-generator, business-plan-template, prototype-generator, prototype-templates, prototype-styles | 5 |
| Schemas | business-plan.ts, prototype.ts | 2 |
| Migrations | 0042, 0043 | 2 |
| Route 확장 | biz-items.ts (+6 endpoints) | 1 |
| Shared types | types.ts 확장 | 1 |
| Tests | service + route tests | ~30 |
| Web 컴포넌트 | BusinessPlanViewer, PrototypePreview | 2 |

### 4.3 예상 지표 변화

| 지표 | Before | After |
|------|--------|-------|
| Endpoints | 202 | 208 (+6) |
| Services | 98 | 103 (+5) |
| Tests | ~1468 | ~1498 (+30) |
| D1 Tables | 60 | 62 (+2) |
| D1 Migrations | 0041 | 0043 (+2) |

---

## 5. Shared Types

```typescript
// packages/shared/src/types.ts 에 추가

export interface BusinessPlanDraft {
  id: string;
  bizItemId: string;
  version: number;
  content: string;           // Markdown
  sectionsSnapshot: string;  // JSON: 매핑 메타데이터
  modelUsed?: string;
  tokensUsed: number;
  generatedAt: string;
}

export interface Prototype {
  id: string;
  bizItemId: string;
  version: number;
  format: "html" | "markdown";
  content: string;
  templateUsed: string;      // StartingPointType
  modelUsed?: string;
  tokensUsed: number;
  generatedAt: string;
}
```

---

## 6. 리스크 및 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| LLM refinement 실패 | 템플릿만 반환됨 (품질 저하) | fallback to template-only (F185 동일 패턴) |
| 선행 데이터 누락 (평가/트렌드 미완료) | 빈 섹션 발생 | 섹션별 "데이터 없음" 플레이스홀더 + 필수 데이터 pre-check |
| Prototype HTML 크기 | D1 TEXT 컬럼 제한 | inline CSS 최적화, 10KB 이하 목표 |
| 한국어 LLM 품질 | 사업계획서 문체 불일치 | system prompt에 KT DS BD팀 문체 가이드 포함 |

---

## 7. 참고 문서

- [[FX-SPEC-BDP-001]] AX-Discovery-Process v0.8 요약
- [[FX-SPEC-PRD-V8]] PRD v8 Final
- F185 구현: `packages/api/src/services/prd-generator.ts` + `prd-template.ts`
- F186 구현: `packages/api/src/services/external-ai-reviewer.ts`
- F190 구현: `packages/api/src/services/biz-item-service.ts` (getTrendReport)
