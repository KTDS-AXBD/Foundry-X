# fx-discovery-native Design Document

> **Summary**: Foundry-X 사이드바 정리(2+3단계만) + Discovery 네이티브 전환 + 아이템→분석→기획서 E2E 흐름 구현
>
> **Project**: Foundry-X
> **Author**: AX BD팀
> **Date**: 2026-04-07
> **Status**: Draft
> **Planning Doc**: [fx-discovery-native.plan.md](../01-plan/features/fx-discovery-native.plan.md)
> **PRD**: [prd-final.md](../specs/fx-discovery-native/prd-final.md)

---

## 1. Overview

### 1.1 Design Goals

1. **IA 간소화**: 6단계 → 2단계(발굴+형상화)로 사이드바/라우트 정리
2. **E2E 흐름**: 아이템 등록 → 발굴 분석 → 기획서 생성까지 끊김 없는 파이프라인
3. **기존 자산 최대 활용**: API 20+개, DiscoveryWizard 등 기존 코드 재사용
4. **Clean Slate**: 기존 데이터는 유지하되, 새 흐름에서 새 아이템부터 시작

### 1.2 Design Principles

- **기존 API 우선**: 프론트엔드만 재구축, 백엔드 변경 최소화
- **점진적 제거**: 라우트를 바로 삭제하지 않고 리다이렉트 → 이후 제거
- **아이템 중심**: 모든 페이지가 biz_item을 축으로 연결

---

## 2. Architecture

### 2.1 변경 범위 다이어그램

```
┌─ sidebar.json ──────────────────────────┐
│  topItems:                              │
│    대시보드 (유지)                        │
│    아이템 등록 (NEW - /getting-started)   │
│  processGroups:                         │
│    ❌ 1.수집 (제거)                      │
│    ✅ 2.발굴 (유지, items 재구성)         │
│    ✅ 3.형상화 (유지, items 정리)         │
│    ❌ 4.검증 (제거)                      │
│    ❌ 5.제품화 (제거)                    │
│    ❌ 6.GTM (제거)                      │
│  bottomItems: 유지                      │
│  adminGroups: 유지                      │
└─────────────────────────────────────────┘

┌─ router.tsx ────────────────────────────┐
│  유지: discovery/*, shaping/*, admin/*  │
│  제거: collection/*, validation/*,      │
│        product/*, gtm/*                 │
│  재구축: getting-started, discovery     │
│  리다이렉트: 제거된 경로 → /discovery    │
└─────────────────────────────────────────┘

┌─ Pages ─────────────────────────────────┐
│  재구축:                                 │
│    getting-started.tsx → 위저드 온보딩    │
│    discovery-unified.tsx → 아이템 목록    │
│    ax-bd/discovery-detail.tsx → 허브     │
│  유지:                                   │
│    offerings-list.tsx, offering-*.tsx    │
│    spec-generator.tsx                   │
│    shaping-prototype.tsx                │
└─────────────────────────────────────────┘
```

### 2.2 데이터 흐름

```
[위저드]                    [발굴]                     [형상화]
   │                         │                          │
   │ POST /biz-items         │ POST .../classify        │ POST .../generate-business-plan
   ▼                         │ POST .../evaluate        │ POST .../generate-prd
┌──────┐                     │ POST .../starting-point  │
│ D1   │◄────────────────────┘                          │
│ biz_ │                     GET .../discovery-criteria  │
│items │                     GET .../analysis-context    │
│      │────────────────────►GET .../next-guide          │
└──────┘                                                 │
   │                                                     │
   │ GET /biz-items/:id ────────────────────────────────►│
   │ (기본정보 + 분석결과 + 산출물 상태)                    │
```

---

## 3. Sprint 209 — F434 사이드바 정리

### 3.1 sidebar.json 변경

**As-Is → To-Be:**

```json
{
  "topItems": [
    { "href": "/dashboard", "label": "대시보드", "iconKey": "LayoutDashboard" },
    { "href": "/getting-started", "label": "새 아이템", "iconKey": "Plus" }
  ],
  "processGroups": [
    {
      "key": "discover",
      "label": "2. 발굴",
      "iconKey": "Search",
      "stageColor": "bg-axis-violet",
      "sortOrder": 0,
      "visible": true,
      "items": [
        { "href": "/discovery", "label": "내 아이템", "iconKey": "List" },
        { "href": "/discovery/report", "label": "평가 결과서", "iconKey": "ClipboardCheck" }
      ]
    },
    {
      "key": "shape",
      "label": "3. 형상화",
      "iconKey": "PenTool",
      "stageColor": "bg-axis-warm",
      "sortOrder": 1,
      "visible": true,
      "items": [
        { "href": "/shaping/business-plan", "label": "사업기획서", "iconKey": "FileSignature" },
        { "href": "/shaping/offerings", "label": "Offering", "iconKey": "FileOutput" },
        { "href": "/shaping/prd", "label": "PRD", "iconKey": "FileText" },
        { "href": "/shaping/prototype", "label": "Prototype", "iconKey": "Code" }
      ]
    }
  ],
  "bottomItems": [
    { "href": "/wiki", "label": "위키", "iconKey": "BookOpen" },
    { "href": "/settings", "label": "설정", "iconKey": "Settings" }
  ],
  "adminGroups": [ /* 기존 유지 */ ]
}
```

**변경 요약:**
- `topItems`: "시작하기" → "새 아이템" (iconKey: Plus)
- `processGroups`: collect, validate, productize, gtm **제거**
- `discover.items`: "발굴" → "내 아이템", "평가 결과서" 유지
- `shape.items`: "Offering Pack" 제거 (Offering과 중복), 나머지 유지
- `sortOrder` 재정렬: discover=0, shape=1

### 3.2 router.tsx 변경

**제거 대상 라우트 (23개):**

```typescript
// ── 제거: 1단계 수집 (4개) ──
// collection/sr, collection/sr/:id, collection/field, collection/ideas, collection/agent

// ── 제거: 4단계 검증 (4개) ──
// validation/pipeline, validation/division, validation/company, validation/meetings

// ── 제거: 5단계 제품화 (2개) ──
// product/mvp, product/poc

// ── 제거: 6단계 GTM (3개) ──
// gtm/projects, gtm/outreach, gtm/outreach/:id

// ── 제거: Phase 13 통합 (2개) ──
// validation (validation-unified), product (product-unified)

// ── 제거: 외부 서비스 (2개) ──
// external/discovery-x, external/foundry

// ── 제거: 리다이렉트 중 불필요 (6개) ──
// sr, discovery/collection, ir-proposals, pipeline, mvp-tracking, projects
```

**추가 리다이렉트:**

```typescript
// 제거된 경로 → /discovery 또는 /getting-started로 안내
{ path: "collection/*", element: <Navigate to="/discovery" replace /> },
{ path: "validation/*", element: <Navigate to="/discovery" replace /> },
{ path: "product/*", element: <Navigate to="/discovery" replace /> },
{ path: "gtm/*", element: <Navigate to="/discovery" replace /> },
```

### 3.3 navigation-loader.ts

- `Plus` 아이콘 추가 (lucide-react import)
- 제거된 아이콘 키는 레지스트리에 남겨도 무해 (사용하지 않을 뿐)

### 3.4 E2E 영향

제거 라우트의 E2E 테스트를 식별하여 skip 처리:

```bash
grep -rl "collection\|validation\|product\|gtm" packages/web/e2e/
```

해당 테스트는 `test.skip()` 처리 + Design 사유 기록

---

## 4. Sprint 209 — F435 위저드형 온보딩

### 4.1 getting-started.tsx 재구축

**As-Is:** 5탭 온보딩 (시작하기/환경설정/스킬레퍼런스/프로세스가이드/FAQ)
**To-Be:** 3단계 위저드

```
┌─────────────────────────────────────────────────┐
│ 새 사업 아이템 등록                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Step 1] ──── [Step 2] ──── [Step 3]          │
│  아이디어 입력    AI 분석    확인 & 등록          │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Step 1: 아이디어 입력                           │
│  ┌─────────────────────────────────────────┐    │
│  │ 사업 아이디어를 자유롭게 설명해주세요        │    │
│  │                                         │    │
│  │ [프롬프트 입력 영역]                      │    │
│  │                                         │    │
│  │ 또는 자료 업로드: [파일 선택]              │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│                          [다음 →]               │
└─────────────────────────────────────────────────┘
```

```
Step 2: AI 분석 결과
┌─────────────────────────────────────────────────┐
│  AI가 분석한 아이템 정보:                         │
│                                                 │
│  제목: [자동 추출, 편집 가능]                     │
│  설명: [자동 추출, 편집 가능]                     │
│  키워드: [chip1] [chip2] [chip3]                │
│  유형 분류: [I/M/P/T/S] (AI 추천)               │
│                                                 │
│  [← 이전]                    [다음 →]           │
└─────────────────────────────────────────────────┘
```

```
Step 3: 확인 & 등록
┌─────────────────────────────────────────────────┐
│  최종 확인:                                      │
│                                                 │
│  제목: {title}                                  │
│  설명: {description}                            │
│  유형: {type}                                   │
│                                                 │
│  [← 이전]               [등록하고 분석 시작 →]    │
└─────────────────────────────────────────────────┘
```

### 4.2 위저드 컴포넌트 구조

```
src/routes/getting-started.tsx (재구축)
└── 내부 상태 관리 (useState, 3단계 step)
    ├── Step 1: 텍스트 입력 + 파일 업로드 UI
    ├── Step 2: POST /biz-items → 결과 표시 + 편집
    └── Step 3: 확인 → navigate('/discovery/items/:id')
```

### 4.3 API 연동

| Step | API | 비고 |
|------|-----|------|
| Step 2 | `POST /biz-items` | body: `{ title, description, source: "wizard" }` |
| Step 2 | `POST /biz-items/:id/classify` | 등록 후 자동 분류 호출 |
| Step 3 완료 | `navigate('/discovery/items/:id')` | 아이템 상세로 이동 |

---

## 5. Sprint 210 — F436 아이템 목록 + F437 분석 대시보드

### 5.1 discovery-unified.tsx 재구축

**As-Is:** 3탭 (대시보드/프로세스/BMC)
**To-Be:** 아이템 카드 목록 + 검색 + 상태 필터

```
┌─────────────────────────────────────────────────┐
│ 내 아이템                              [+ 새 아이템] │
│                                                 │
│ [🔍 아이템 검색...]                              │
│ 필터: [전체] [대기] [분석 중] [분석 완료] [완료]   │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌──────────────┐  ┌──────────────┐              │
│ │ AI 비서 도입   │  │ 클라우드 전환  │              │
│ │ [분석 중] 뱃지  │  │ [대기] 뱃지    │              │
│ │ I — 아이디어형  │  │ T — 기술형    │              │
│ │ 4월 1일 등록   │  │ 4월 2일 등록  │              │
│ └──────────────┘  └──────────────┘              │
│                                                 │
│ ─── 빈 상태 ───                                 │
│  💡 아직 등록된 아이템이 없어요.                   │
│  [+ 첫 아이템 등록하기]                           │
└─────────────────────────────────────────────────┘
```

> **진행률 표시 결정**: 목록 API(`GET /biz-items`)에 progress 미포함 — N+1 방지 목적.
> 9기준 진행률은 아이템 상세 페이지(DiscoveryCriteriaPanel)에서만 표시.

### 5.2 아이템 카드 컴포넌트

```typescript
// 새 컴포넌트: src/components/feature/discovery/BizItemCard.tsx
interface BizItemCardProps {
  item: BizItemSummary;  // id, title, description, status, discoveryType, createdAt
}
// 상태(뱃지): item.status 기반 (draft→대기, analyzing→분석 중, analyzed→분석 완료, ...)
// 유형: item.discoveryType (I/M/P/T/S) — 한국어 레이블 매핑
```

### 5.3 F437 발굴 9기준 체크리스트 패널 (DiscoveryCriteriaPanel)

```typescript
// 새 컴포넌트: src/components/feature/discovery/DiscoveryCriteriaPanel.tsx
// 아이템 상세(discovery-detail.tsx)에 임베드
interface DiscoveryCriteriaPanelProps {
  bizItemId: string;
}
// API: GET /biz-items/:id/discovery-criteria → CriteriaProgress
// API: GET /biz-items/:id/next-guide → 다음 단계 가이드
```

**표시 요소:**
- 완료 수 / 전체 수 + 프로그레스바
- gateStatus 뱃지 (ready/warning/blocked)
- 9기준 체크리스트: 각 기준명 + 조건 + 완료 여부 아이콘
- 다음 단계 가이드 패널 (nextGuide API)

### 5.4 API 활용

| 용도 | API | 비고 |
|------|-----|------|
| 아이템 목록 | `GET /biz-items` | org 필터, status 쿼리 |
| 9기준 체크리스트 | `GET /biz-items/:id/discovery-criteria` | 아이템 상세에서 호출 |
| 다음 단계 가이드 | `GET /biz-items/:id/next-guide` | 아이템 상세에서 호출 |

---

## 6. Sprint 211 — F438 발굴 분석 실행

### 6.1 분석 스텝퍼 UI

```
┌─────────────────────────────────────────────────┐
│ 발굴 분석 — AI 비서 도입                          │
├─────────────────────────────────────────────────┤
│                                                 │
│ ● 2-0 시작점 분류 ✅                             │
│ │  유형: I (Intelligence), 시작점: 시장 분석       │
│ │                                               │
│ ● 2-1 자동 분류 ✅                               │
│ │  산업: IT/소프트웨어, 규모: 중소기업              │
│ │                                               │
│ ● 2-2 다관점 평가 🔄                             │
│ │  [실행 중... 3/5 페르소나 완료]                  │
│ │                                               │
│ ○ 2-3 시장 분석 ⬜                               │
│ │                                               │
│ ○ 2-4 경쟁사 분석 ⬜                             │
│ │                                               │
│ ○ ... (2-5 ~ 2-10)                              │
│                                                 │
│ [분석 시작] or [다음 단계 실행]                    │
└─────────────────────────────────────────────────┘
```

### 6.2 MVP 분석 단계 (3개)

| 단계 | API | 구현 |
|------|-----|------|
| 2-0 시작점 | `POST /biz-items/:id/starting-point` | 5유형 분류, 결과 표시 |
| 2-1 분류 | `POST /biz-items/:id/classify` | ItemClassifier, 결과 카드 |
| 2-2 평가 | `POST /biz-items/:id/evaluate` | BizPersonaEvaluator, 페르소나별 |

### 6.3 분석 결과 표시

각 단계 완료 시 접기/펼치기 패널:
- 결과 요약 (1~2줄)
- 상세 보기 (접기)
- "보완 입력" 텍스트 영역 (선택)
- 다음 단계 CTA

---

## 7. Sprint 212 — F439 아이템 허브 + F440 기획서

### 7.1 아이템 상세 허브 (discovery-detail.tsx 재구축)

```
┌─────────────────────────────────────────────────┐
│ ← 돌아가기     AI 비서 도입     🟢 분석 완료      │
├─────────────────────────────────────────────────┤
│                                                 │
│ [기본정보]  [발굴분석]  [형상화]                   │
│                                                 │
│ ─── 기본정보 탭 ───                              │
│ 제목: AI 비서 도입                               │
│ 설명: 사내 업무 효율화를 위한...                   │
│ 유형: I (Intelligence)                          │
│ 등록일: 2026-04-07                              │
│ [편집]                                          │
│                                                 │
│ ─── 발굴분석 탭 ───                              │
│ (F438 스텝퍼 UI)                                │
│                                                 │
│ ─── 형상화 탭 ───                                │
│ 파이프라인:                                      │
│ [기획서 ✅] → [Offering ⬜] → [PRD ⬜] → [Proto ⬜] │
│                                                 │
│ 사업기획서: v1 (2026-04-07)    [보기] [재생성]     │
│ Offering: -                    [생성하기] (비활성)  │
│ PRD: -                         [생성하기] (비활성)  │
│ Prototype: -                   [생성하기] (비활성)  │
└─────────────────────────────────────────────────┘
```

### 7.2 파이프라인 상태 컴포넌트

```typescript
// 새 컴포넌트: src/components/feature/discovery/ShapingPipeline.tsx
interface ShapingPipelineProps {
  bizItemId: string;
  businessPlan: { version: number; createdAt: string } | null;
  offering: { id: string; status: string } | null;
  prd: { version: number } | null;
  prototype: { id: string } | null;
}
```

- 이전 단계 미완료 → 다음 "생성하기" 비활성 + 툴팁
- 완료 → 다음 단계 활성

### 7.3 F440 기획서 생성 흐름

```
발굴 완료 → "사업기획서 생성" CTA 클릭
  → POST /biz-items/:id/generate-business-plan
  → 로딩 상태 표시 (AI 생성 중...)
  → 완료 → GET /biz-items/:id/business-plan
  → 기획서 열람 UI (마크다운 렌더링 + 편집)
```

---

## 8. Component Inventory

### 8.1 신규 컴포넌트

| 컴포넌트 | 경로 | Sprint | 용도 |
|----------|------|--------|------|
| `ItemRegistrationWizard` | `routes/getting-started.tsx` 내부 | 209 | 3단계 위저드 |
| `BizItemCard` | `components/feature/discovery/BizItemCard.tsx` | 210 | 아이템 카드 |
| `AnalysisStepper` | `components/feature/discovery/AnalysisStepper.tsx` | 211 | 11단계 스텝퍼 |
| `AnalysisStepResult` | `components/feature/discovery/AnalysisStepResult.tsx` | 211 | 단계별 결과 |
| `ShapingPipeline` | `components/feature/discovery/ShapingPipeline.tsx` | 212 | 파이프라인 상태 바 |
| `BusinessPlanViewer` | `components/feature/discovery/BusinessPlanViewer.tsx` | 212 | 기획서 열람 |

### 8.2 재사용 컴포넌트 (기존)

| 컴포넌트 | 경로 | 재사용 방식 |
|----------|------|-----------|
| `WizardStepper` | `components/feature/discovery/` | 분석 스텝퍼 기반 |
| `WizardStepDetail` | `components/feature/discovery/` | 단계 상세 기반 |
| `HitlReviewPanel` | `components/feature/discovery/` | 보완 입력 패널 |
| `ProcessFlowV82` | `components/feature/` | 프로세스 가이드 참조 |
| UI primitives | `components/ui/` | Card, Badge, Button, Tabs 등 |

### 8.3 수정 컴포넌트

| 컴포넌트 | 변경 내용 |
|----------|----------|
| `discovery-unified.tsx` | 3탭 → 아이템 카드 목록 |
| `getting-started.tsx` | 5탭 → 3단계 위저드 |
| `ax-bd/discovery-detail.tsx` | 분류/시작점 뷰 → 3탭 허브 |

---

## 9. Test Plan

### 9.1 E2E 테스트

| 시나리오 | 검증 내용 | Sprint |
|---------|----------|--------|
| 사이드바 2단계만 표시 | 발굴+형상화 그룹만 렌더링, 수집/검증/제품화/GTM 없음 | 209 |
| 위저드 아이템 등록 | Step 1→2→3 진행, API 호출, 아이템 생성 | 209 |
| 아이템 목록 표시 | 카드 렌더링, 상태 필터, 빈 상태 | 210 |
| 분석 실행 | 3단계 순차 실행, 스텝퍼 업데이트 | 211 |
| 아이템 허브 탭 전환 | 기본정보/분석/형상화 탭 | 212 |
| 기획서 생성 | CTA → 로딩 → 결과 표시 | 212 |

### 9.2 제거 라우트 E2E skip 처리

`packages/web/e2e/` 에서 제거 경로를 참조하는 테스트는 `test.skip()` + 사유 기록:
- "F434: 1/4/5/6단계 라우트 제거로 인한 의도적 skip"

---

## 10. Implementation Order

### Sprint 209 (F434 + F435)

```
1. [ ] sidebar.json 수정 — processGroups 정리
2. [ ] navigation-loader.ts — Plus 아이콘 추가
3. [ ] router.tsx — 제거 라우트 블록 삭제 + catch-all 리다이렉트
4. [ ] E2E — 제거 라우트 관련 테스트 skip 처리
5. [ ] getting-started.tsx — 위저드 UI 재구축 (Step 1~3)
6. [ ] typecheck + lint + build 확인
7. [ ] E2E — 사이드바 + 위저드 테스트 추가
```

### Sprint 210 (F436 + F437)

```
1. [ ] BizItemCard 컴포넌트 생성
2. [ ] discovery-unified.tsx 재구축 — 아이템 카드 목록
3. [ ] 빈 상태 UI (아이템 없을 때)
4. [ ] 상태 필터 구현
5. [ ] typecheck + lint + build 확인
```

### Sprint 211 (F438)

```
1. [ ] AnalysisStepper + AnalysisStepResult 컴포넌트
2. [ ] 분석 실행 트리거 (3단계: 시작점/분류/평가)
3. [ ] AI 실행 중 로딩 상태
4. [ ] 결과 접기/펼치기 + 보완 입력
5. [ ] typecheck + lint + build 확인
```

### Sprint 212 (F439 + F440)

```
1. [ ] discovery-detail.tsx 재구축 — 3탭 허브
2. [ ] ShapingPipeline 컴포넌트
3. [ ] BusinessPlanViewer 컴포넌트
4. [ ] 기획서 생성 API 연동
5. [ ] 파이프라인 잠금/해제 로직
6. [ ] typecheck + lint + build 확인
7. [ ] E2E — 허브 + 기획서 테스트
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-07 | 초안 — Plan + 코드 분석 기반 | AX BD팀 (Claude) |
