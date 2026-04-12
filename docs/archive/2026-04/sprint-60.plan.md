---
code: FX-PLAN-060
title: "Sprint 60 — F193 pm-skills 방법론 모듈 + F194 검증 기준 설계 + F195 방법론 관리 UI"
version: 1.0
status: Active
category: PLAN
created: 2026-03-25
updated: 2026-03-25
author: Sinclair Seo (AI-assisted)
sprint: 60
features: [F193, F194, F195]
req: [FX-REQ-193, FX-REQ-194, FX-REQ-195]
---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | 방법론 플러그인 아키텍처(F191~F192)가 BDP 전용으로만 모듈화되어 있어, pm-skills 방법론을 추가하려면 별도 파이프라인·검증 기준·관리 UI가 필요하지만 현재 존재하지 않음 |
| **Solution** | pm-skills 18개 스킬 기반 분석 파이프라인 + 스킬별 산출물 기반 검증 기준 세트 구현(F193+F194), 방법론 목록·선택·진행률 통합 관리 UI 추가(F195) |
| **Function UX Effect** | 사업 아이템 상세 → "방법론 변경" → pm-skills 선택 → 10개 스킬 실행 가이드 제공 → 스킬별 검증 기준 자동 체크 → 방법론 관리 페이지에서 전체 현황 통합 조회 |
| **Core Value** | 단일 BDP 방법론 종속 탈피 → 상황별 최적 방법론 교체 가능 + 방법론별 독립 품질 게이트로 분석 완성도 보장 |

| 항목 | 값 |
|------|-----|
| Feature | F193 pm-skills 모듈 + F194 검증 기준 + F195 관리 UI |
| Sprint | 60 |
| 선행 조건 | Sprint 59 (F191 레지스트리+라우터, F192 BDP 모듈화) |
| 예상 산출물 | 4 services, 1 D1 migration, 1 route 신규, 1 route 확장, 8+ endpoints, 2 schemas, 3 shared types, 4 Web 컴포넌트, 1 Web 페이지 |

---

## 1. 배경 및 목표

### 1.1 Phase 5c 방법론 플러그인 아키텍처

```
Sprint 59 (기반)                    Sprint 60 (확장)
┌────────────────────┐             ┌─────────────────────┐
│ F191 레지스트리+라우터 │ ──────────→│ F193 pm-skills 모듈   │
│ F192 BDP 모듈화      │             │ F194 pm-skills 기준   │
└────────────────────┘             │ F195 관리 UI          │
                                    └─────────────────────┘
```

Sprint 59에서 정의한 `MethodologyModule` 인터페이스를 pm-skills가 두 번째로 구현하여, 방법론 교체 가능성을 실증해요.

### 1.2 목표

1. **F193**: pm-skills 전용 분석 파이프라인 — 기존 `PM_SKILLS_GUIDES` 10개 스킬을 `MethodologyModule` 구현으로 래핑
2. **F194**: pm-skills 검증 기준 세트 — BDP 9기준과 독립적인, 스킬별 산출물 기반 완료 기준 설계
3. **F195**: 방법론 관리 UI — 레지스트리 API 기반 목록/선택/변경/진행률 통합 뷰

### 1.3 선행 완료 확인

| Feature | 설명 | 상태 | 비고 |
|---------|------|------|------|
| F191 | 방법론 레지스트리 + 라우터 | 📋 (Sprint 59) | **선행 필수** — MethodologyModule 인터페이스, methodology_registry 테이블 |
| F192 | BDP 모듈화 | 📋 (Sprint 59) | BDP가 첫 번째 구현체, pm-skills는 두 번째 |
| F184 | HITL 분석 파이프라인 | ✅ | pm-skills 가이드 기반 분석 패턴 |
| F183 | Discovery 9기준 체크리스트 | ✅ | BDP 검증 기준 패턴 참고 |
| F189 | Discovery 진행률 대시보드 | ✅ | 진행률 UI 패턴 참고 |

> ⚠️ **Sprint 59 미구현 시 가정**: F191이 아직 구현되지 않았으므로, 이 Plan에서는 `MethodologyModule` 인터페이스 시그니처를 가정하고 작성해요. Sprint 59 구현 후 Design 단계에서 실제 인터페이스에 맞게 조정해요.

### 1.4 가정하는 MethodologyModule 인터페이스 (Sprint 59 F191)

```typescript
// F191에서 정의될 인터페이스 (가정)
interface MethodologyModule {
  id: string;                          // "bdp" | "pm-skills" | ...
  name: string;
  description: string;
  version: string;

  // 분석 파이프라인
  classifyItem(item: BizItem): Promise<ClassificationResult>;
  getAnalysisSteps(classification: ClassificationResult): AnalysisStep[];
  getCriteria(): CriterionDefinition[];

  // 검증 게이트
  checkGate(bizItemId: string, db: D1Database): Promise<GateResult>;

  // 검토 방법
  getReviewMethods(): ReviewMethod[];

  // 매칭 스코어 (아이템에 대한 방법론 적합도)
  matchScore(item: BizItem): number;   // 0~100
}
```

---

## 2. F193 — pm-skills 방법론 모듈

### 2.1 개요

기존 `pm-skills-guide.ts`의 10개 스킬 가이드를 `MethodologyModule` 인터페이스 구현으로 래핑해요. BDP가 "5시작점 → 분석 경로 → 9기준"이라면, pm-skills는 "18개 스킬 → 실행 가이드 → 스킬별 기준"이에요.

### 2.2 pm-skills vs BDP 비교

| 차원 | BDP (F192) | pm-skills (F193) |
|------|-----------|-----------------|
| 분류 방식 | 5시작점 자동 분류 (LLM) | 스킬 적합도 기반 추천 (매칭 스코어) |
| 분석 단계 | 경로별 고정 순서 (7~10 스텝) | 스킬 의존 관계 기반 가변 순서 |
| 검증 기준 | 9기준 (공통) | 스킬별 산출물 기준 (F194에서 설계) |
| 게이트 판정 | 9기준 중 7개+ → ready | 스킬별 기준 80%+ 충족 → ready |
| 검토 방법 | 다중 AI 검토 + 페르소나 평가 | 스킬 산출물 교차 검증 |
| 적합 대상 | 명확한 시작점이 있는 아이템 | HITL 방식으로 스킬 순차 실행하는 경우 |

### 2.3 스킬 의존 관계 그래프

```
/interview ──────────┐
                     ├──→ /value-proposition ──→ /business-model ──→ /strategy
/research-users ─────┤                                                    ↑
                     ├──→ /competitive-analysis ──────────────────────────┘
/market-scan ────────┘

/brainstorm (독립) ──→ 아이디어 발산 후 위 파이프라인 투입
/beachhead-segment ←── /research-users + /market-scan 완료 후
/pre-mortem ←──────── /strategy 완료 후 (리스크 + 검증 실험)
```

### 2.4 PmSkillsModule 핵심 설계

```typescript
// packages/api/src/services/pm-skills-module.ts

export class PmSkillsModule implements MethodologyModule {
  id = "pm-skills";
  name = "PM Skills 기반 분석";
  description = "18개 PM 스킬을 순차 실행하여 사업 아이템을 분석하는 HITL 방식 방법론";
  version = "1.0.0";

  // 아이템 분류 — 스킬 적합도 기반 (LLM 없이 규칙 기반)
  classifyItem(item: BizItem): Promise<PmSkillsClassification>;

  // 분석 단계 — 의존 관계 기반 추천 순서
  getAnalysisSteps(classification: PmSkillsClassification): PmSkillAnalysisStep[];

  // 검증 기준 — F194에서 정의한 기준 세트 반환
  getCriteria(): PmSkillCriterionDefinition[];

  // 게이트 — 스킬별 산출물 기준 80%+ 충족 여부
  checkGate(bizItemId: string, db: D1Database): Promise<PmSkillsGateResult>;

  // 검토 방법 — 스킬 산출물 교차 검증
  getReviewMethods(): ReviewMethod[];

  // 매칭 — HITL 선호 + 명확한 시작점 없는 아이템에 높은 점수
  matchScore(item: BizItem): number;
}
```

### 2.5 분류 로직 (classifyItem)

BDP의 LLM 기반 5시작점 분류와 달리, pm-skills는 **규칙 기반** 분류:

```
분류 결과 = PmSkillsClassification {
  recommendedSkills: string[];   // 추천 실행 순서
  skillScores: Record<string, number>;  // 스킬별 적합도 0~100
  entryPoint: "discovery" | "validation" | "expansion";  // 진입 유형
}
```

진입 유형별 추천 스킬 순서:
- **discovery** (새로운 영역): interview → research-users → market-scan → competitive-analysis → value-proposition → business-model → pre-mortem → strategy → beachhead-segment
- **validation** (가설 검증): pre-mortem → interview → competitive-analysis → value-proposition → strategy
- **expansion** (기존 확장): market-scan → competitive-analysis → beachhead-segment → business-model → strategy

### 2.6 API 설계

```
GET  /api/methodologies/pm-skills/analysis-steps/:bizItemId
  Response: 200 { steps: PmSkillAnalysisStep[], entryPoint, recommendedSkills }

POST /api/methodologies/pm-skills/classify/:bizItemId
  Response: 200 { classification: PmSkillsClassification }

GET  /api/methodologies/pm-skills/skill-guide/:skill
  Response: 200 { guide: PmSkillGuide }
  (기존 pm-skills-guide.ts 재사용)

POST /api/methodologies/pm-skills/execute-skill/:bizItemId
  Body: { skill: string, input: string, analysisContextId?: string }
  Response: 201 { executionId, skill, result, evidenceGenerated }
```

### 2.7 서비스 구조

```
packages/api/src/services/
├── pm-skills-module.ts         # PmSkillsModule implements MethodologyModule (NEW)
├── pm-skills-pipeline.ts       # 스킬 실행 순서 + 의존성 해결 (NEW)
├── pm-skills-guide.ts          # 기존 10개 스킬 가이드 (EXISTING, 참조)
└── pm-skills-criteria.ts       # F194 검증 기준 (NEW, §3 참조)
```

---

## 3. F194 — pm-skills 검증 기준 설계

### 3.1 개요

BDP의 9기준(`DISCOVERY_CRITERIA`)과 **완전히 독립적인** pm-skills 전용 기준 세트를 설계해요. BDP가 "9개 공통 기준"이라면, pm-skills는 "스킬별 산출물 기반 기준"이에요.

### 3.2 설계 원칙

1. **스킬별 1~2개 기준**: 각 스킬의 핵심 산출물이 기준 충족 근거
2. **산출물 검증 가능**: 기준 조건이 구체적이고 자동/반자동 검증 가능
3. **BDP 9기준과 매핑 가능하지만 독립 운영**: 호환성은 유지하되 강제 연동 없음

### 3.3 pm-skills 검증 기준 세트 (18개 → 12개 통합 기준)

```typescript
export const PM_SKILLS_CRITERIA = [
  // Discovery 기준 (스킬 → 산출물 기반)
  { id: 1, name: "고객 인사이트", skills: ["/interview", "/research-users"],
    condition: "인터뷰 결과 1건+ + 고객 세그먼트 2개+ + JTBD 문장 1개+",
    outputType: "interview_result, segment_profile" },
  { id: 2, name: "시장 기회 정량화", skills: ["/market-scan"],
    condition: "TAM/SAM/SOM 수치 + 연간 성장률 + why now 트리거 1개+",
    outputType: "market_report" },
  { id: 3, name: "경쟁 포지셔닝", skills: ["/competitive-analysis"],
    condition: "경쟁사 3개+ 프로필 + 포지셔닝 맵 + 차별화 전략 1개+",
    outputType: "competitive_report" },
  { id: 4, name: "가치 제안 명확성", skills: ["/value-proposition"],
    condition: "JTBD 문장 + 가치 제안 캔버스 완성 + 차별화 포인트 2개+",
    outputType: "value_proposition" },
  { id: 5, name: "수익 모델 실현성", skills: ["/business-model"],
    condition: "BMC 9블록 완성 + 과금 모델 + 유닛 이코노믹스 초안",
    outputType: "business_model_canvas" },
  { id: 6, name: "리스크 식별 완전성", skills: ["/pre-mortem"],
    condition: "핵심 리스크 5개+ + 우선순위 + 대응 방향",
    outputType: "risk_assessment" },
  { id: 7, name: "검증 실험 설계", skills: ["/pre-mortem"],
    condition: "검증 실험 3개+ + 성공/실패 기준 + 실행 방법",
    outputType: "experiment_design" },
  { id: 8, name: "전략 방향 정합성", skills: ["/strategy"],
    condition: "전략 방향 1개+ + 우선순위 매트릭스 + 로드맵 초안",
    outputType: "strategy_document" },
  { id: 9, name: "비치헤드 시장 선정", skills: ["/beachhead-segment"],
    condition: "비치헤드 시장 프로필 + 선정 근거 3가지+ + 진입 전략",
    outputType: "beachhead_analysis" },
  { id: 10, name: "아이디어 발산 충분성", skills: ["/brainstorm"],
    condition: "Use Case 10개+ + 평가 기준 + 상위 3개 선정 근거",
    outputType: "brainstorm_result" },

  // 교차 검증 기준
  { id: 11, name: "분석 일관성", skills: ["cross-validation"],
    condition: "가치 제안 ↔ 경쟁 차별화 ↔ 수익 모델 간 논리적 일관성",
    outputType: "consistency_check" },
  { id: 12, name: "실행 가능성", skills: ["cross-validation"],
    condition: "전략 → 비치헤드 → 검증 실험 간 연결고리 + KT DS 역량 매칭",
    outputType: "feasibility_check" },
] as const;
```

### 3.4 게이트 판정 로직

```
BDP:       9기준 중 7개+ completed → "ready"
pm-skills: 12기준 중 10개+ completed (id 11,12 교차검증 필수) → "ready"
           8~9개 → "warning"
           <8개 → "blocked"
```

### 3.5 D1 스키마

```sql
-- 0044_pm_skills_criteria.sql
CREATE TABLE IF NOT EXISTS pm_skills_criteria (
  id TEXT PRIMARY KEY,
  biz_item_id TEXT NOT NULL REFERENCES biz_items(id),
  criterion_id INTEGER NOT NULL,
  skill TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',    -- pending | in_progress | completed | needs_revision
  evidence TEXT,                              -- 산출물 참조 (JSON)
  output_type TEXT,
  score INTEGER,                             -- 0~100 (선택적 정량 평가)
  completed_at TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(biz_item_id, criterion_id)
);
```

### 3.6 API 설계

```
GET  /api/methodologies/pm-skills/criteria/:bizItemId
  Response: 200 { criteria: PmSkillsCriteriaProgress }

POST /api/methodologies/pm-skills/criteria/:bizItemId/:criterionId
  Body: { status, evidence?, score? }
  Response: 200 { criterion: PmSkillsCriterion }

GET  /api/methodologies/pm-skills/gate/:bizItemId
  Response: 200 { gateStatus, completed, total, details }
```

### 3.7 서비스 구조

```
packages/api/src/services/
├── pm-skills-criteria.ts       # PmSkillsCriteriaService (NEW)
│   ├── initCriteria()          # 12기준 초기화
│   ├── getCriteria()           # 기준 목록 + 진행률
│   ├── updateCriterion()       # 기준 상태 변경
│   ├── checkGate()             # 게이트 판정
│   └── crossValidate()         # id 11,12 교차 검증 자동 체크
```

---

## 4. F195 — 방법론 관리 UI

### 4.1 개요

Sprint 59 F191의 레지스트리 API를 기반으로, 등록된 방법론 목록 조회 · 아이템별 방법론 선택/변경 · 방법론별 진행률 통합 뷰를 제공하는 Web UI를 구현해요.

### 4.2 페이지 구조

```
/methodologies                     — 방법론 관리 메인 페이지 (NEW)
  ├─ MethodologyListPanel          — 등록된 방법론 목록 (카드형)
  ├─ MethodologyDetailPanel        — 선택한 방법론 상세 (스킬/기준/매칭 로직)
  └─ MethodologyProgressDashboard  — 아이템별 방법론 적용 현황 + 진행률

/biz-items/:id (기존 확장)
  └─ MethodologySelector           — 방법론 선택/변경 드롭다운 + 추천 표시
```

### 4.3 컴포넌트 설계

#### 4.3.1 MethodologyListPanel

```
┌─────────────────────────────────────────────┐
│ 📋 등록된 방법론                              │
├─────────────────────────────────────────────┤
│ ┌────────────────┐  ┌────────────────┐      │
│ │ 📊 BDP          │  │ 🧠 pm-skills    │     │
│ │ v1.0.0          │  │ v1.0.0          │     │
│ │ 5시작점 기반 분석 │  │ 18스킬 HITL 분석│     │
│ │ 사용: 15 아이템  │  │ 사용: 3 아이템  │     │
│ │ [상세]           │  │ [상세]           │     │
│ └────────────────┘  └────────────────┘      │
└─────────────────────────────────────────────┘
```

#### 4.3.2 MethodologySelector (BizItem 상세 페이지 내)

```
┌─────────────────────────────────────────────┐
│ 방법론: [BDP ▾]   💡 추천: pm-skills (82점)  │
│                                              │
│ ⚠️ 변경 시 기존 분석 결과는 유지되며,          │
│    새 방법론 기준으로 재평가됩니다.             │
│                     [변경] [취소]              │
└─────────────────────────────────────────────┘
```

#### 4.3.3 MethodologyProgressDashboard

```
┌─────────────────────────────────────────────┐
│ 📊 방법론별 진행 현황                         │
├─────────────────────────────────────────────┤
│ BDP (15 아이템)                              │
│ ████████████░░░ 80% (12/15 게이트 통과)       │
│                                              │
│ pm-skills (3 아이템)                          │
│ ██████░░░░░░░░░ 40% (1/3 게이트 통과)         │
│                                              │
│ 아이템별 상세                                  │
│ ┌──────────┬──────────┬────────┬───────┐     │
│ │ 아이템     │ 방법론    │ 게이트  │ 진행률│     │
│ ├──────────┼──────────┼────────┼───────┤     │
│ │ AI 보험   │ BDP      │ ready  │ 100%  │     │
│ │ IoT 관제  │ pm-skills │ blocked│ 33%  │     │
│ └──────────┴──────────┴────────┴───────┘     │
└─────────────────────────────────────────────┘
```

### 4.4 API 의존성 (F191 레지스트리 API 가정)

```
GET  /api/methodologies                        — 방법론 목록
GET  /api/methodologies/:id                    — 방법론 상세
GET  /api/methodologies/:id/usage-stats        — 사용 통계
POST /api/biz-items/:id/methodology            — 방법론 변경
GET  /api/biz-items/:id/methodology            — 현재 방법론
GET  /api/methodologies/progress-summary       — 전체 진행률 요약
```

### 4.5 Web 파일 구조

```
packages/web/src/
├── app/(app)/methodologies/
│   └── page.tsx                    # 방법론 관리 페이지 (NEW)
├── components/feature/
│   ├── MethodologyListPanel.tsx     # 방법론 목록 (NEW)
│   ├── MethodologyDetailPanel.tsx   # 방법론 상세 (NEW)
│   ├── MethodologyProgressDash.tsx  # 진행률 대시보드 (NEW)
│   └── MethodologySelector.tsx      # 아이템별 선택기 (NEW)
```

---

## 5. 구현 계획

### 5.1 Worker 분배

```
Worker 1: F193 + F194 (pm-skills 모듈 + 검증 기준)
  ├─ D1 migration 0044 (pm_skills_criteria)
  ├─ pm-skills-module.ts (MethodologyModule 구현)
  ├─ pm-skills-pipeline.ts (실행 순서 + 의존성)
  ├─ pm-skills-criteria.ts (검증 기준 서비스)
  ├─ Zod schemas (pm-skills-criteria.ts, pm-skills-module.ts)
  ├─ Route: methodology-pm-skills.ts (또는 discovery.ts 확장)
  ├─ Shared types 확장
  └─ Tests (service + route)

Worker 2: F195 (방법론 관리 UI)
  ├─ methodologies/page.tsx
  ├─ MethodologyListPanel.tsx
  ├─ MethodologyDetailPanel.tsx
  ├─ MethodologyProgressDash.tsx
  ├─ MethodologySelector.tsx
  ├─ api-client 확장
  └─ Tests (component)
```

### 5.2 구현 순서

```
Phase A: F193+F194 — pm-skills 모듈 + 검증 기준 (W1)
  A1. D1 migration 0044 (pm_skills_criteria)
  A2. pm-skills-criteria.ts (12기준 정의 + CRUD + 게이트 판정)
  A3. pm-skills-pipeline.ts (스킬 의존 관계 + 실행 순서)
  A4. pm-skills-module.ts (MethodologyModule 구현체)
  A5. Zod schemas
  A6. Route endpoints (7개)
  A7. Shared types
  A8. Tests (30+)

Phase B: F195 — 방법론 관리 UI (W2, Phase A와 병렬)
  B1. MethodologyListPanel.tsx
  B2. MethodologyDetailPanel.tsx
  B3. MethodologyProgressDash.tsx
  B4. MethodologySelector.tsx
  B5. methodologies/page.tsx
  B6. api-client 확장 (methodology endpoints)
  B7. Tests (15+)
```

### 5.3 예상 산출물

| 구분 | 파일 | 수량 |
|------|------|------|
| Services | pm-skills-module, pm-skills-pipeline, pm-skills-criteria, (route helper) | 3~4 |
| Schemas | pm-skills-criteria.ts, pm-skills-module.ts | 2 |
| Migrations | 0044 | 1 |
| Route | methodology-pm-skills.ts (또는 기존 확장) | 1 |
| Endpoints | 7 (F193: 4 + F194: 3) | 7 |
| Shared types | PmSkillsClassification, PmSkillsCriterion, MethodologyProgressSummary | 3 |
| Web 컴포넌트 | MethodologyListPanel, MethodologyDetailPanel, MethodologyProgressDash, MethodologySelector | 4 |
| Web 페이지 | methodologies/page.tsx | 1 |
| Tests | ~45 (API 30 + Web 15) | 45 |

### 5.4 예상 지표 변화

| 지표 | Before | After |
|------|--------|-------|
| Endpoints | 208 | 215 (+7) |
| Services | 103 | 106~107 (+3~4) |
| Tests (API) | ~1193 | ~1223 (+30) |
| Tests (Web) | ~87 | ~102 (+15) |
| D1 Tables | 62 | 63 (+1) |
| D1 Migrations | 0043 | 0044 (+1) |

---

## 6. Shared Types

```typescript
// packages/shared/src/types.ts 에 추가

export interface PmSkillsClassification {
  entryPoint: "discovery" | "validation" | "expansion";
  recommendedSkills: string[];
  skillScores: Record<string, number>;
}

export interface PmSkillsCriterion {
  id: string;
  bizItemId: string;
  criterionId: number;
  name: string;
  skill: string;
  condition: string;
  status: "pending" | "in_progress" | "completed" | "needs_revision";
  evidence: string | null;
  outputType: string;
  score: number | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface PmSkillsCriteriaProgress {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  criteria: PmSkillsCriterion[];
  gateStatus: "blocked" | "warning" | "ready";
}

export interface MethodologyProgressSummary {
  methodologyId: string;
  methodologyName: string;
  totalItems: number;
  gateReady: number;
  gateWarning: number;
  gateBlocked: number;
  avgProgress: number;
}
```

---

## 7. 리스크 및 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Sprint 59 미구현 (F191 인터페이스 부재) | pm-skills 모듈이 인터페이스를 구현할 수 없음 | 가정 인터페이스로 구현 후, Sprint 59 merge 시 조정. 또는 Sprint 59를 먼저 구현 |
| 스킬별 산출물 형식 표준화 안 됨 | evidence 필드의 자유 텍스트로 자동 검증 어려움 | outputType 필드 + 반정형 JSON 스키마로 구조화, 자동 검증은 Phase 5d로 이관 |
| 방법론 변경 시 기존 분석 결과 처리 | 사용자 혼란 | 기존 결과 유지 + 새 방법론 기준으로 재평가 (기존 데이터 삭제 안 함) |
| 교차 검증 기준(id 11,12) 자동화 난이도 | LLM 의존 판정 → 비용 | 수동 판정 기본 + LLM 보조 제안 (HITL 방식) |

---

## 8. 참고 문서

- [[FX-SPEC-001]] SPEC.md §6 Phase 5c 방법론 플러그인 아키텍처
- [[FX-SPEC-BDP-001]] AX-Discovery-Process v0.8 요약
- F183 구현: `packages/api/src/services/discovery-criteria.ts` (BDP 9기준 패턴)
- F184 구현: `packages/api/src/services/pm-skills-guide.ts` (10개 스킬 가이드)
- F189 구현: `packages/api/src/services/discovery-progress.ts` (진행률 패턴)
- F191 가정: MethodologyModule 인터페이스 (Sprint 59에서 정의 예정)
