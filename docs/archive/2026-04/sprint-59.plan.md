---
code: FX-PLAN-059
title: "Sprint 59 — F191 방법론 레지스트리+라우터 + F192 BDP 모듈화 래핑"
version: 1.0
status: Active
category: PLAN
created: 2026-03-25
updated: 2026-03-25
author: Sinclair Seo (AI-assisted)
sprint: 59
features: [F191, F192]
req: [FX-REQ-191, FX-REQ-192]
---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | BDP(사업개발프로세스) 분석 파이프라인이 하드코딩되어 있어, 다른 방법론(pm-skills, 추가 방법론)을 추가/교체할 수 없고 아이템 특성에 맞는 방법론을 선택할 방법이 없음 |
| **Solution** | MethodologyModule 인터페이스 + Registry + Router 패턴으로 방법론을 플러그인화하고, 기존 BDP 서비스를 첫 번째 구현체로 래핑하여 기능 변경 없이 아키텍처 전환 |
| **Function UX Effect** | 사업 아이템 등록 → 아이템 특성 기반 방법론 자동 추천(matchScore) → 사용자 선택/확정 → 선택된 방법론의 분석 파이프라인 자동 적용 |
| **Core Value** | 메가 프로세스(BDP 6단계) 불변 + 분석/검증 구간만 방법론별 커스텀 → Sprint 60 pm-skills 모듈 및 향후 방법론 확장의 기반 |

| 항목 | 값 |
|------|-----|
| Feature | F191 방법론 레지스트리+라우터 + F192 BDP 모듈화 래핑 |
| Sprint | 59 |
| 예상 산출물 | 1 인터페이스, 1 레지스트리, 1 라우터, 1 BDP 모듈, 1 D1 migration, 1 route, 6+ endpoints, 2 schemas, 2 shared types, 30+ tests |

---

## 1. 배경 및 목표

### 1.1 Phase 5c — 방법론 플러그인 아키텍처

Phase 5b(Sprint 53~58)에서 BDP 6단계 자동화를 완성했어요. 이제 Phase 5c에서 이 파이프라인을 **다중 방법론 지원 구조**로 전환해요:

```
Phase 5b (완료)                    Phase 5c (Sprint 59~60)
┌─────────────────┐               ┌──────────────────────────┐
│ BDP 하드코딩     │   ──전환──>   │ MethodologyModule 인터페이스│
│ (분류/분석/기준)  │               │  ├── BDP 모듈 (F192)      │
│                 │               │  ├── pm-skills 모듈 (F193) │
│                 │               │  └── 추가 방법론 (TBD)     │
└─────────────────┘               └──────────────────────────┘
```

**메가 프로세스(불변):**
```
1단계 수집 → 2단계 발굴 → 3단계 형상화 → 4단계 검증공유 → 5단계 제품화 → 6단계 GTM
                  ↑ 방법론이 커스텀하는 구간: 분석 파이프라인 + 검증 기준
```

### 1.2 목표

1. **F191**: MethodologyModule 인터페이스 정의 + MethodologyRegistry(등록/조회) + MethodologyRouter(matchScore 기반 자동 추천) + DB 테이블 + REST API
2. **F192**: 기존 BDP 서비스(ItemClassifier, StartingPointClassifier, DiscoveryCriteria, AnalysisContext, PrdGenerator 등)를 BdpMethodologyModule로 래핑 — **기능 변경 없이** 인터페이스 준수

### 1.3 선행 완료 확인

| Feature | 설명 | 상태 |
|---------|------|------|
| F175 | 사업 아이템 3유형 분류 (ItemClassifier) | ✅ |
| F178 | 8페르소나 × 8축 평가 (BizPersonaEvaluator) | ✅ |
| F182 | 5시작점 분류 (StartingPointClassifier) | ✅ |
| F183 | Discovery 9기준 체크리스트 (DiscoveryCriteria) | ✅ |
| F184 | pm-skills 분석 가이드 (AnalysisContext) | ✅ |
| F185 | PRD 자동생성 (PrdGenerator) | ✅ |
| F186 | 다중 AI 검토 (PrdReviewPipeline) | ✅ |
| F187 | 멀티 페르소나 평가 (BizPersonaEvaluator PRD 확장) | ✅ |
| F188 | Six Hats 토론 (SixHatsDebate) | ✅ |
| F189 | Discovery 진행률 대시보드 | ✅ |
| F190 | 시장/트렌드 데이터 연동 | ✅ |
| F180 | 사업계획서 초안 자동생성 | ✅ |
| F181 | Prototype 자동생성 | ✅ |

### 1.4 핵심 설계 원칙

1. **Strategy Pattern**: MethodologyModule = Strategy 인터페이스, BDP/pm-skills = ConcreteStrategy
2. **Registry Pattern**: 싱글톤 레지스트리가 모듈을 런타임 관리 (등록/해제/조회)
3. **기능 무변경 래핑**: F192는 기존 서비스를 조립만 할 뿐, 비즈니스 로직 수정 없음
4. **DB 기반 선택 이력**: 아이템별 방법론 선택을 D1에 저장 (감사 추적)

---

## 2. 구현 범위

### 2.1 F191 — 방법론 레지스트리 + 라우터

| 구분 | 산출물 | 설명 |
|------|--------|------|
| **인터페이스** | `methodology-module.ts` | MethodologyModule 인터페이스 + 공통 타입 |
| **레지스트리** | `methodology-registry.ts` | 싱글톤 Registry (register/unregister/get/getAll/findBest) |
| **라우터** | methodology route endpoints | matchScore 기반 추천 + 선택 API |
| **DB** | `0044_methodology_selections.sql` | methodology_modules + methodology_selections 테이블 |
| **Schema** | `methodology.ts` | Zod 스키마 (module, selection) |
| **Shared** | `methodology.ts` | 공유 타입 정의 |

#### MethodologyModule 인터페이스

```typescript
export interface MethodologyModule {
  /** 고유 식별자 (e.g., "bdp", "pm-skills") */
  id: string;
  /** 표시명 */
  name: string;
  /** 설명 */
  description: string;
  /** 지원 범위 버전 */
  version: string;

  /**
   * 아이템 특성 기반 적합도 점수 (0~100)
   * Router가 모든 모듈의 matchScore를 비교하여 추천
   */
  matchScore(item: BizItemContext): Promise<number>;

  /** 아이템 분류 (Type A/B/C 또는 방법론 고유 분류) */
  classifyItem(item: BizItemContext): Promise<ModuleClassificationResult>;

  /** 분석 단계 목록 반환 (시작점별 경로) */
  getAnalysisSteps(classification: ModuleClassificationResult): AnalysisStep[];

  /** 검증 기준 목록 반환 */
  getCriteria(): CriterionDefinition[];

  /** Gate 통과 여부 확인 */
  checkGate(bizItemId: string, db: D1Database): Promise<GateCheckResult>;

  /** 검토 방법 목록 (AI 리뷰, 페르소나 등) */
  getReviewMethods(): ReviewMethodDefinition[];
}
```

#### D1 테이블 설계

```sql
-- methodology_modules: 등록된 방법론 메타데이터 (DB 기반 조회용)
CREATE TABLE IF NOT EXISTS methodology_modules (
  id TEXT PRIMARY KEY,           -- "bdp", "pm-skills"
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',
  is_active INTEGER NOT NULL DEFAULT 1,
  config_json TEXT,              -- 방법론별 설정 JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- methodology_selections: 아이템별 방법론 선택 이력
CREATE TABLE IF NOT EXISTS methodology_selections (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  methodology_id TEXT NOT NULL,
  match_score REAL,              -- 추천 시 점수
  selected_by TEXT NOT NULL DEFAULT 'auto', -- 'auto' | 'manual'
  is_current INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(biz_item_id, methodology_id)
);
```

#### API 엔드포인트 (F191)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/methodologies` | 등록된 방법론 목록 |
| GET | `/api/methodologies/:id` | 방법론 상세 (criteria, steps 포함) |
| POST | `/api/biz-items/:itemId/methodology/recommend` | 아이템 기반 방법론 추천 (matchScore 비교) |
| POST | `/api/biz-items/:itemId/methodology/select` | 방법론 선택/변경 |
| GET | `/api/biz-items/:itemId/methodology` | 현재 선택된 방법론 조회 |
| GET | `/api/biz-items/:itemId/methodology/history` | 방법론 선택 이력 |

### 2.2 F192 — BDP 모듈화 래핑

| 구분 | 산출물 | 설명 |
|------|--------|------|
| **모듈** | `bdp-methodology-module.ts` | BdpMethodologyModule (MethodologyModule 구현) |
| **등록** | Registry 초기화 | 앱 시작 시 BDP 모듈 자동 등록 |
| **라우트 수정** | `biz-items.ts` 확장 | methodology 컨텍스트 주입 (기존 로직 변경 최소) |

#### BdpMethodologyModule 조립 구조

```
BdpMethodologyModule implements MethodologyModule
  ├── matchScore()      → BDP 적합도 (기본 80, Type A/B/C 가중치)
  ├── classifyItem()    → ItemClassifier.classify() 위임
  ├── getAnalysisSteps()→ ANALYSIS_PATHS[startingPoint].steps 반환
  ├── getCriteria()     → DISCOVERY_CRITERIA 상수 반환
  ├── checkGate()       → DiscoveryCriteriaService.checkGate() 위임
  └── getReviewMethods()→ [AI 3-provider, 페르소나 8인, Six Hats] 반환
```

**기존 서비스 래핑 (기능 변경 없음):**

| 기존 서비스 | 모듈 메서드 | 위임 방식 |
|-------------|------------|----------|
| `ItemClassifier.classify()` | `classifyItem()` | 직접 위임, 결과를 ModuleClassificationResult로 매핑 |
| `ANALYSIS_PATHS` (정적 데이터) | `getAnalysisSteps()` | 정적 반환 |
| `DISCOVERY_CRITERIA` (상수) | `getCriteria()` | 정적 반환 |
| `DiscoveryCriteriaService.checkGate()` | `checkGate()` | 직접 위임 |
| 리뷰 메타데이터 (3-provider + 페르소나 + Six Hats) | `getReviewMethods()` | 정적 반환 |

---

## 3. 기술 설계 요약

### 3.1 파일 구조

```
packages/api/src/
├── services/
│   ├── methodology-module.ts          # [F191] 인터페이스 + 공통 타입
│   ├── methodology-registry.ts        # [F191] 싱글톤 Registry
│   └── bdp-methodology-module.ts      # [F192] BDP 모듈 구현
├── routes/
│   └── methodology.ts                 # [F191] 방법론 API 라우트
├── schemas/
│   └── methodology.ts                 # [F191] Zod 스키마
├── db/migrations/
│   └── 0044_methodology_selections.sql # [F191] DB 마이그레이션
└── __tests__/
    ├── methodology-registry.test.ts   # [F191] Registry 단위 테스트
    ├── methodology-routes.test.ts     # [F191] API 통합 테스트
    └── bdp-methodology-module.test.ts # [F192] BDP 모듈 테스트

packages/shared/src/
└── methodology.ts                     # [F191] 공유 타입
```

### 3.2 의존 관계

```
F191 (인터페이스+레지스트리+라우터)
  │
  ▼
F192 (BDP 모듈화 래핑)
  │  ├── ItemClassifier (기존)
  │  ├── StartingPointClassifier (기존)
  │  ├── DiscoveryCriteriaService (기존)
  │  ├── AnalysisContextService (기존)
  │  ├── ANALYSIS_PATHS (기존 정적)
  │  └── DISCOVERY_CRITERIA (기존 상수)
  │
  ▼
Sprint 60: F193 (pm-skills 모듈) + F194 (검증기준) + F195 (관리 UI)
```

### 3.3 Registry 초기화 흐름

```
앱 시작 (index.ts)
  ├── MethodologyRegistry.getInstance()
  ├── BdpMethodologyModule 생성 (의존성 주입)
  ├── registry.register(bdpModule)
  └── 향후: registry.register(pmSkillsModule) // Sprint 60
```

---

## 4. Worker Plan (2-Worker 병렬)

### W1: F191 — 레지스트리 + 인터페이스 + 라우터

**수정 허용 파일:**
- `packages/api/src/services/methodology-module.ts` (신규)
- `packages/api/src/services/methodology-registry.ts` (신규)
- `packages/api/src/routes/methodology.ts` (신규)
- `packages/api/src/schemas/methodology.ts` (신규)
- `packages/api/src/db/migrations/0044_methodology_selections.sql` (신규)
- `packages/api/src/__tests__/methodology-registry.test.ts` (신규)
- `packages/api/src/__tests__/methodology-routes.test.ts` (신규)
- `packages/shared/src/methodology.ts` (신규)

**구현 순서:**
1. `methodology-module.ts` — 인터페이스 + 공통 타입 정의
2. `methodology-registry.ts` — 싱글톤 Registry (register/unregister/get/getAll/findBest)
3. `packages/shared/src/methodology.ts` — 공유 타입
4. `methodology.ts` (schema) — Zod 스키마
5. `0044_methodology_selections.sql` — D1 마이그레이션
6. `methodology.ts` (route) — 6개 엔드포인트
7. 테스트 (Registry 단위 + API 통합)

### W2: F192 — BDP 모듈화 래핑

**수정 허용 파일:**
- `packages/api/src/services/bdp-methodology-module.ts` (신규)
- `packages/api/src/__tests__/bdp-methodology-module.test.ts` (신규)

**구현 순서:**
1. `bdp-methodology-module.ts` — BdpMethodologyModule implements MethodologyModule
2. 기존 서비스 import + 위임 메서드 구현
3. matchScore 로직: 기본 80 + Type 가중치(A:+10, B:+5, C:0)
4. 테스트 (모듈 단위 + 레지스트리 통합)

**의존성:** W1 인터페이스 완료 후 W2 시작 (또는 인터페이스만 먼저 생성 후 병렬 가능)

---

## 5. 테스트 계획

| 영역 | 테스트 | 예상 수 |
|------|--------|---------|
| Registry 단위 | register/unregister/get/getAll/findBest | 8 |
| API 통합 | 6 endpoints × (정상 + 에러) | 12 |
| BDP 모듈 단위 | 6 메서드 × (정상 + 엣지) | 12 |
| 통합 | Registry + BDP 모듈 + API 연동 | 4 |
| **합계** | | **~36** |

---

## 6. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 기존 biz-items 라우트와 methodology 라우트 간 역할 중복 | 중 | F192에서는 래핑만 수행, biz-items 라우트는 건드리지 않음. 통합은 Sprint 60에서 점진적으로 |
| matchScore 알고리즘의 정확도 부족 | 낮 | 초기엔 BDP만 등록되어 항상 BDP 추천. pm-skills 등록 시(Sprint 60) 실제 비교 테스트 |
| MethodologyModule 인터페이스 변경 시 모든 구현체 수정 필요 | 중 | 인터페이스를 최소한으로 설계 + 선택적 메서드는 default 구현 제공 |

---

## 7. 성공 기준

| 기준 | 목표 |
|------|------|
| MethodologyModule 인터페이스 완성 | 6개 메서드 시그니처 확정 |
| BDP 모듈 래핑 | 기존 13개 BDP 서비스 중 핵심 5개 위임 완료 |
| API 엔드포인트 | 6개 신규, 전체 정상 동작 |
| 테스트 | 30+ 신규, 기존 테스트 회귀 없음 |
| Match Rate | ≥ 90% (Gap Analysis 기준) |
| 기존 기능 영향 | **0건** (BDP 기능 무변경 확인) |
