---
code: FX-ANLS-058
title: "Sprint 58 Gap Analysis — F180 사업계획서 초안 + F181 Prototype 자동 생성"
version: 1.0
status: Active
category: ANLS
created: 2026-03-25
updated: 2026-03-25
author: gap-detector agent
sprint: 58
features: [F180, F181]
ref: "[[FX-DSGN-058]]"
matchRate: 97
---

# Sprint 58 Gap Analysis

> Design: [[FX-DSGN-058]] `docs/02-design/features/sprint-58.design.md`

---

## 1. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 97% | ✅ |
| Architecture Compliance | 100% | ✅ |
| Convention Compliance | 100% | ✅ |
| Test Coverage (구조) | 90% | ✅ |
| **Overall** | **97%** | ✅ |

---

## 2. Match Rate by Component

| # | Component | Design | Implementation | Match |
|---|-----------|--------|----------------|:-----:|
| 1 | D1 Migration 0042 (business_plan_drafts) | CREATE TABLE + INDEX | ✅ 동일 | 100% |
| 2 | D1 Migration 0043 (prototypes) | CREATE TABLE + INDEX | ✅ 동일 | 100% |
| 3 | business-plan-template.ts | BP_SECTIONS 10개 + mapDataToSections + renderBpMarkdown + 헬퍼 | ✅ 동일 구조 | 97% |
| 4 | business-plan-generator.ts | BpGenerationInput + BusinessPlanDraft + generate/buildTemplate/refineWithLlm/getLatest/listVersions | ✅ 동일 | 100% |
| 5 | prototype-styles.ts | VERDICT_THEMES + getTheme + getBaseCSS + SVG_ICONS 5개 | ✅ 구현 (ThemeColors 타입 별칭 추가) | 97% |
| 6 | prototype-templates.ts | PrototypeData + SECTION_ORDER 5종 + renderPrototypeHtml + escapeHtml | ✅ 동일 | 97% |
| 7 | prototype-generator.ts | PrototypeGenerationInput + generate/extractPrototypeData/getLatest/getLatestContent | ✅ 동일 | 100% |
| 8 | schemas/business-plan.ts | GenerateBusinessPlanSchema + BusinessPlanDraftSchema + BusinessPlanVersionsSchema | ✅ 동일 | 100% |
| 9 | schemas/prototype.ts | GeneratePrototypeSchema + PrototypeSchema | ✅ 동일 | 100% |
| 10 | biz-items.ts route (+6 endpoints) | POST generate-business-plan, GET business-plan, GET versions, POST generate-prototype, GET prototype, GET preview | ✅ 6개 모두 구현 | 100% |
| 11 | shared/types.ts | BusinessPlanDraft + Prototype interfaces | ✅ 동일 | 100% |
| 12 | Tests — service (4 files) | template + generator tests for F180, F181 | ✅ 51 tests | 90% |
| 13 | Tests — route (1 file) | integration tests for 6 endpoints | ✅ 13 tests | 90% |

---

## 3. Differences (6건 — 모두 Low Impact)

| # | Item | Design 명세 | 실제 구현 | Impact | 판정 |
|---|------|------------|----------|--------|------|
| 1 | `formatItemType`/`formatVerdict` 접근성 | private helper (module-scope) | `export function` (테스트 직접 호출용) | Low | 의도적 개선 |
| 2 | `escapeHtml` 접근성 | private helper | `export function` (테스트 직접 호출용) | Low | 의도적 개선 |
| 3 | `SECTION_ORDER` 접근성 | module-private const | `export const` (테스트 검증용) | Low | 의도적 개선 |
| 4 | `getTheme()` return type | `typeof VERDICT_THEMES["default"]` | named `ThemeColors` type alias | Low | 타입 에러 해소 |
| 5 | generate-prototype 에러 응답 | `{ error: "..." }` only | `{ error: "...", message: "..." }` 추가 | Low | 일관성 개선 |
| 6 | Route test 파일명 | `routes/biz-items-f180-f181.test.ts` | `biz-items-bp-proto.test.ts` | Low | 컨벤션 따름 |

---

## 4. Missing Features: 0

Design에 명세된 모든 기능이 구현되었어요.

---

## 5. Added Features: 0

Design에 없는 추가 기능은 없어요.

---

## 6. Test Summary

| Test File | Tests | Status |
|-----------|:-----:|:------:|
| business-plan-template.test.ts | 21 | ✅ |
| business-plan-generator.test.ts | 10 | ✅ |
| prototype-templates.test.ts | 10 | ✅ |
| prototype-generator.test.ts | 10 | ✅ |
| biz-items-bp-proto.test.ts (route) | 13 | ✅ |
| **Total** | **64** | **64/64 passed** |

---

## 7. Verdict

**Match Rate: 97%** — Report 단계 진행 가능.

6건의 차이는 모두 **의도적 개선**(테스트 접근성, 타입 명확성, 에러 메시지 일관성)이므로 구현 수정 불필요. Design 문서에 실제 구현을 소급 반영하면 100% 달성 가능.
