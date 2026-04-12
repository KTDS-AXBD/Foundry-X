---
code: FX-ANLS-060
title: "Sprint 60 Gap Analysis — F193 pm-skills 모듈 + F194 검증 기준 + F195 관리 UI"
version: 1.0
status: Active
category: ANLS
created: 2026-03-25
updated: 2026-03-25
author: Sinclair Seo (AI-assisted)
sprint: 60
features: [F193, F194, F195]
ref: "[[FX-DSGN-060]]"
---

# Sprint 60 Gap Analysis Report

> **Analysis Type**: Design vs Implementation Gap Analysis
>
> **Project**: Foundry-X (api 0.1.0 / web 0.1.0 / shared 0.1.0)
> **Analyst**: gap-detector agent
> **Date**: 2026-03-25
> **Design Doc**: [sprint-60.design.md](../../02-design/features/sprint-60.design.md)

---

## 1. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 97% | ✅ |
| Architecture Compliance | 100% | ✅ |
| Convention Compliance | 98% | ✅ |
| Test Coverage | 95% | ✅ |
| **Overall** | **97%** | ✅ |

---

## 2. API Endpoints (Design Section 6 vs routes/methodology.ts)

| Method | Path | Design | Impl | Status |
|--------|------|:------:|:----:|:------:|
| GET | `/methodologies` | F195 | ✅ | ✅ Match |
| GET | `/methodologies/:id` | F195 | ✅ | ✅ Match |
| GET | `/methodologies/recommend/:bizItemId` | F195 | ✅ | ✅ Match |
| POST | `/methodologies/pm-skills/classify/:bizItemId` | F193 | ✅ | ✅ Match |
| GET | `/methodologies/pm-skills/analysis-steps/:bizItemId` | F193 | ✅ | ✅ Match |
| GET | `/methodologies/pm-skills/skill-guide/:skill` | F193 | ✅ | ✅ Match |
| GET | `/methodologies/pm-skills/criteria/:bizItemId` | F194 | ✅ | ✅ Match |
| POST | `/methodologies/pm-skills/criteria/:bizItemId/:criterionId` | F194 | ✅ | ✅ Match |
| GET | `/methodologies/pm-skills/gate/:bizItemId` | F194 | ✅ | ✅ Match |

**9/9 endpoints 100% 일치**

---

## 3. Data Model (Design Section 3.1 vs 0044_pm_skills_criteria.sql)

| Column | Design Type | Impl Type | Status |
|--------|-------------|-----------|:------:|
| id | TEXT PK | TEXT PK | ✅ |
| biz_item_id | TEXT NOT NULL REF | TEXT NOT NULL REF | ✅ |
| criterion_id | INTEGER NOT NULL | INTEGER NOT NULL | ✅ |
| skill | TEXT NOT NULL | TEXT NOT NULL | ✅ |
| status | TEXT NOT NULL DEFAULT 'pending' | TEXT NOT NULL DEFAULT 'pending' | ✅ |
| evidence | TEXT | TEXT | ✅ |
| output_type | TEXT | TEXT | ✅ |
| score | INTEGER | INTEGER | ✅ |
| completed_at | TEXT | TEXT | ✅ |
| updated_at | TEXT NOT NULL | TEXT NOT NULL | ✅ |
| UNIQUE(biz_item_id, criterion_id) | ✅ | ✅ | ✅ |
| idx_pm_skills_criteria_biz_item | ✅ | ✅ | ✅ |
| idx_pm_skills_criteria_status | ✅ | ✅ | ✅ |

**Migration: 100% 일치 (char-level identical)**

---

## 4. MethodologyModule Interface (Design Section 2 vs methodology-types.ts)

| Member | Design | Impl | Status |
|--------|:------:|:----:|:------:|
| `readonly id: string` | ✅ | ✅ | ✅ |
| `readonly name: string` | ✅ | ✅ | ✅ |
| `readonly description: string` | ✅ | ✅ | ✅ |
| `readonly version: string` | ✅ | ✅ | ✅ |
| `classifyItem()` | ✅ | ✅ | ✅ |
| `getAnalysisSteps()` | ✅ | ✅ | ✅ |
| `getCriteria()` | ✅ | ✅ | ✅ |
| `checkGate()` | ✅ | ✅ | ✅ |
| `getReviewMethods()` | ✅ | ✅ | ✅ |
| `matchScore()` | ✅ | ✅ | ✅ |
| `ClassificationResult` | ✅ | ✅ | ✅ |
| `AnalysisStepDefinition` | ✅ | ✅ | ✅ |
| `CriterionDefinition` | ✅ | ✅ | ✅ |
| `GateResult` | ✅ | ✅ | ✅ |
| `ReviewMethod` | ✅ | ✅ | ✅ |
| `MethodologyRegistryEntry` | ✅ | ✅ | ✅ |
| `registerMethodology()` | ✅ | ✅ | ✅ |
| `getMethodology()` | ✅ | ✅ | ✅ |
| `getAllMethodologies()` | ✅ | ✅ | ✅ |
| `recommendMethodology()` | ✅ | ✅ | ✅ |

Design에 없지만 구현에 추가: `clearRegistry()` -- 테스트용 유틸, 합리적 추가.

---

## 5. Service Comparison

### 5.1 PmSkillsCriteriaService (Design Section 3.2 vs pm-skills-criteria.ts)

- 12기준 정의: **char-level identical** (id 1~12, name, skills, condition, outputType, isRequired)
- `PmSkillsCriterionStatus`: 4 values 일치
- `PmSkillsCriterion` interface: 12 fields 일치
- `PmSkillsCriteriaProgress` interface: 7 fields 일치
- `PmCriteriaRow` interface: 10 fields 일치
- `initialize()`: INSERT OR IGNORE 로직 일치
- `getAll()`: empty fallback + status counting + gate 로직 일치
- `update()`: COALESCE + completedAt 자동 설정 일치
- `checkGate()`: requiredMissing + gateStatus 일치
- `computePmGateStatus()`: threshold (8/10) 일치

### 5.2 pm-skills-pipeline.ts (Design Section 3.3 vs 구현)

- `SKILL_DEPENDENCIES`: 10개 스킬 의존 그래프 일치
- `EntryPoint`: 3 types 일치
- `ENTRY_POINT_ORDERS`: discovery(9)/validation(5)/expansion(5) 순서 일치
- `detectEntryPoint()`: validation/expansion 키워드 일치
- `PmSkillAnalysisStep`: 7 fields 일치
- `buildAnalysisSteps()`: 로직 일치
- `getNextExecutableSkills()`: 로직 일치
- `computeSkillScores()`: 키워드 매핑 + 기본 50점 + 15점/매칭 일치

### 5.3 PmSkillsModule (Design Section 3.4 vs pm-skills-module.ts)

- `implements MethodologyModule`: ✅
- id="pm-skills", name, description, version: 일치
- `classifyItem()`: entryPoint + confidence 계산 일치
- `getAnalysisSteps()`: isRequired 상위 5개 일치
- `getCriteria()`: PM_SKILLS_CRITERIA 반환 일치
- `checkGate()`: DB 위임 일치
- `getReviewMethods()`: 2개 메소드(cross-validation, feasibility-check) 일치
- `matchScore()`: 기본 40점 + hitl/ambiguous 키워드 + classification 보너스 일치
- `registerPmSkillsModule()`: 레지스트리 등록 일치

---

## 6. Zod Schemas (Design Section 3.5 vs schemas/pm-skills.ts)

| Schema | Design | Impl | Status |
|--------|:------:|:----:|:------:|
| PmSkillsCriterionSchema | ✅ | ✅ | ✅ Match |
| UpdatePmSkillsCriterionSchema | ✅ | ✅ | ✅ Match |
| PmSkillsClassificationSchema | ✅ | ✅ | ✅ Match |
| PmSkillsAnalysisStepSchema | ✅ | ✅ | ✅ Match |

**4/4 스키마 100% 일치**

---

## 7. Shared Types (Design Section 3.8 vs shared/types.ts)

| Type | Design | Impl | Status |
|------|:------:|:----:|:------:|
| PmSkillsClassification | ✅ | ✅ | ✅ |
| PmSkillsCriterion | ✅ | ✅ | ✅ |
| PmSkillsCriteriaProgress | ✅ | ✅ | ✅ |
| MethodologyInfo | ✅ | ✅ | ✅ |
| MethodologyRecommendation | ✅ | ✅ | ✅ |
| MethodologyProgressSummary | ✅ | ✅ | ✅ |

**6/6 타입 100% 일치**

---

## 8. Web UI (Design Section 4 vs 구현)

### 8.1 Components

| Design Component | Impl File | Status |
|------------------|-----------|:------:|
| MethodologyListPanel.tsx | `components/feature/MethodologyListPanel.tsx` | ✅ |
| MethodologyDetailPanel.tsx | `components/feature/MethodologyDetailPanel.tsx` | ✅ |
| MethodologyProgressDash.tsx | `components/feature/MethodologyProgressDash.tsx` | ✅ |
| MethodologySelector.tsx | `components/feature/MethodologySelector.tsx` | ✅ |
| methodologies/page.tsx | `app/(app)/methodologies/page.tsx` | ✅ |
| sidebar.tsx nav 추가 | `{ href: "/methodologies", label: "방법론 관리" }` | ✅ |

### 8.2 api-client Functions

| Design Function | Impl Function | Status | Notes |
|-----------------|---------------|:------:|-------|
| `getMethodologies()` | `getMethodologies()` | ✅ | |
| `getMethodologyDetail()` | `getMethodologyDetail()` | ✅ | |
| `getMethodologyRecommendation()` | `getMethodologyRecommendation()` | ✅ | |
| `getPmSkillsCriteria()` | `getPmSkillsCriteria()` | ✅ | |
| `getPmSkillsAnalysisSteps()` | `getPmSkillsAnalysisSteps()` | ✅ | |
| `classifyWithPmSkills()` | `classifyWithPmSkills()` | ✅ | |
| `getPmSkillsGate()` | `getPmSkillsGate()` | ✅ | |

### 8.3 api-client Types

| Type | Design | Impl | Status |
|------|:------:|:----:|:------:|
| MethodologyInfo | ✅ | ✅ | ✅ |
| MethodologyDetail | ✅ | ✅ | ✅ |
| MethodologyRecommendation | ✅ | ✅ | ✅ |
| PmSkillsCriteriaProgress | ✅ | ✅ | ✅ |
| PmSkillAnalysisStep | ✅ | ✅ | ✅ |
| PmSkillsClassification | ✅ | ✅ | ✅ |
| GateResult | ✅ | ✅ | ✅ |

---

## 9. Differences Found

### 9.1 Missing Features (Design O, Implementation X)

**(없음)**

### 9.2 Added Features (Design X, Implementation O)

| Item | Implementation Location | Description | Impact |
|------|------------------------|-------------|--------|
| `clearRegistry()` | methodology-types.ts:103 | 테스트용 레지스트리 초기화 함수 | Low (positive) |

### 9.3 Changed Features (Design != Implementation)

| Item | Design | Implementation | Impact |
|------|--------|----------------|:------:|
| api-client base function | `apiFetch()` | `fetchApi()` / `postApi()` | None |
| MethodologyListPanel type import | 로컬 인터페이스 정의 | `import { MethodologyInfo } from api-client` | None |
| MethodologyDetailPanel type import | 로컬 인터페이스 정의 | `import { MethodologyDetail } from api-client` | None |
| MethodologySelector type import | 로컬 인터페이스 정의 | `import { MethodologyRecommendation } from api-client` | None |

모두 기존 코드베이스 패턴을 따른 의도적 변경 -- api-client에서 타입을 export하고 컴포넌트에서 import하는 것이 DRY 원칙에 부합.

---

## 10. Route Registration

| Item | Design Section | Impl | Status |
|------|:-------------:|:----:|:------:|
| `import { methodologyRoute }` | 3.7 (A10) | index.ts:3 | ✅ |
| `app.route("/api", methodologyRoute)` | 3.7 (A10) | index.ts:11 | ✅ |

---

## 11. Test Coverage

| Test File | Design (Section 5) | Actual | Status |
|-----------|:-------------------:|:------:|:------:|
| pm-skills-criteria.test.ts | ~18 tests | ✅ part of 72 | ✅ |
| pm-skills-pipeline.test.ts | ~12 tests | ✅ part of 72 | ✅ |
| pm-skills-module.test.ts | ~8 tests | ✅ part of 72 | ✅ |
| methodology-types.test.ts | ~6 tests | ✅ part of 72 | ✅ |
| routes/methodology.test.ts | ~18 tests | ✅ part of 72 | ✅ |
| methodology-ui.test.tsx | ~10 tests | 9 tests | ✅ |

- **API Tests**: 72/72 passed (5 files)
- **Web Tests**: 9/9 passed (1 file)
- **Typecheck**: 0 errors on Sprint 60 files

---

## 12. Convention Compliance

### 12.1 Naming

| Category | Convention | Sprint 60 Files | Compliance |
|----------|-----------|:---------------:|:----------:|
| Components | PascalCase | 4/4 | 100% |
| Services/Classes | PascalCase | 3/3 | 100% |
| Functions | camelCase | all | 100% |
| Constants | UPPER_SNAKE_CASE | PM_SKILLS_CRITERIA, SKILL_DEPENDENCIES, ENTRY_POINT_ORDERS | 100% |
| Files (component) | PascalCase.tsx | 4/4 | 100% |
| Files (service) | kebab-case.ts | 4/4 | 100% |
| Route file | kebab-case.ts | 1/1 | 100% |

### 12.2 Architecture Compliance

- Route -> Service -> DB: ✅ (routes/methodology.ts -> services/pm-skills-*.ts -> D1)
- Schema validation in route: ✅ (UpdatePmSkillsCriterionSchema.safeParse)
- Org-level auth check (orgId): ✅ (7/9 endpoints use orgId, 2 registry endpoints are org-independent)
- Web: Component -> api-client -> API: ✅

---

## 13. File Checklist (Design Section 7)

| # | File | Design | Impl | Status |
|---|------|:------:|:----:|:------:|
| 1 | `services/methodology-types.ts` | NEW | ✅ | ✅ |
| 2 | `db/migrations/0044_pm_skills_criteria.sql` | NEW | ✅ | ✅ |
| 3 | `services/pm-skills-criteria.ts` | NEW | ✅ | ✅ |
| 4 | `services/pm-skills-pipeline.ts` | NEW | ✅ | ✅ |
| 5 | `services/pm-skills-module.ts` | NEW | ✅ | ✅ |
| 6 | `schemas/pm-skills.ts` | NEW | ✅ | ✅ |
| 7 | `routes/methodology.ts` | NEW | ✅ | ✅ |
| 8 | `api/src/index.ts` | MODIFY | ✅ | ✅ |
| 9 | `shared/src/types.ts` | MODIFY | ✅ | ✅ |
| 10 | `web/src/lib/api-client.ts` | MODIFY | ✅ | ✅ |
| 11 | `MethodologyListPanel.tsx` | NEW | ✅ | ✅ |
| 12 | `MethodologyDetailPanel.tsx` | NEW | ✅ | ✅ |
| 13 | `MethodologyProgressDash.tsx` | NEW | ✅ | ✅ |
| 14 | `MethodologySelector.tsx` | NEW | ✅ | ✅ |
| 15 | `methodologies/page.tsx` | NEW | ✅ | ✅ |
| 16 | `sidebar.tsx` | MODIFY | ✅ | ✅ |
| 17 | `pm-skills-criteria.test.ts` | NEW | ✅ | ✅ |
| 18 | `pm-skills-pipeline.test.ts` | NEW | ✅ | ✅ |
| 19 | `pm-skills-module.test.ts` | NEW | ✅ | ✅ |
| 20 | `methodology-types.test.ts` | NEW | ✅ | ✅ |
| 21 | `routes/methodology.test.ts` | NEW | ✅ | ✅ |
| 22 | `methodology-ui.test.tsx` | NEW | ✅ | ✅ |

**22/22 files (NEW 16 + MODIFY 6): 100% 완료**

---

## 14. Match Rate Summary

```
+-----------------------------------------------+
|  Overall Match Rate: 97%                       |
+-----------------------------------------------+
|  Endpoints:      9/9   (100%)                  |
|  Data Model:     13/13 (100%)                  |
|  Interfaces:     20/20 (100%)                  |
|  Services:       3/3   (100%)                  |
|  Schemas:        4/4   (100%)                  |
|  Shared Types:   6/6   (100%)                  |
|  Web Components: 6/6   (100%)                  |
|  API Client:     7/7   (100%)                  |
|  Files:          22/22 (100%)                  |
|  Tests:          81/81 passed                  |
+-----------------------------------------------+
|  Differences: 4 (all intentional/positive)     |
|  - clearRegistry() added for testability       |
|  - api-client function naming follows codebase |
|  - Component type imports from api-client (DRY)|
+-----------------------------------------------+
```

---

## 15. Verdict

Match Rate **97%** >= 90% threshold -- **PASS**

4건의 차이는 모두 의도적 개선(테스트 지원, 기존 코드베이스 패턴 준수, DRY 원칙)이며 기능적 영향 없음.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-25 | Initial gap analysis | gap-detector |
