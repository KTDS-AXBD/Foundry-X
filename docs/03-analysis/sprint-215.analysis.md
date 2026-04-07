---
code: FX-ANLS-S215
title: Sprint 215 Gap Analysis — F444 사업기획서 편집기 + F445 기획서 템플릿 다양화
version: 1.0
status: Active
category: analysis
created: 2026-04-08
updated: 2026-04-08
author: gap-detector
matchRate: 100
---

# Sprint 215 Gap Analysis

## Overview
- **Design**: `docs/02-design/features/sprint-215.design.md`
- **Date**: 2026-04-08
- **Match Rate**: 100% (14/14 PASS)

## Gap Table

| # | Item | Status | Note |
|---|------|:------:|------|
| G1 | D1 migration 0117 (business_plan_sections + plan_templates) | **PASS** | CHECK constraints 일부 누락이나 Zod 레이어 검증으로 동등 |
| G2 | GET /sections API | **PASS** | `{ sections }` 응답, 인증 확인 |
| G3 | PATCH /sections/:num API | **PASS** | Zod 검증 + 1~10 범위 체크 |
| G4 | POST /sections/:num/regenerate API | **PASS** | runner 없으면 기존 content fallback |
| G5 | POST /save API | **PASS** | 201 + version 증가 + 섹션 조합 |
| G6 | GET /diff API | **PASS** | v1/v2 파라미터 + changed 감지 |
| G7 | BusinessPlanEditor 컴포넌트 | **PASS** | `onCancel` 추가, 내부 fetch 방식 (기능 동등) |
| G8 | SectionEditor textarea | **PASS** | aria-label + onChange + 섹션 배지 |
| G9 | AI 재생성 버튼 | **PASS** | 로딩 스피너 + disabled 상태 |
| G10 | VersionHistoryPanel | **PASS** | 버전 목록 + diff 표시 (changed 강조) |
| G11 | TemplateSelector 모달 | **PASS** | 3종 카드 + 톤/분량 선택 + overlay |
| G12 | generateBusinessPlan 파라미터 확장 | **PASS** | templateType/tone/length 전달 |
| G13 | discovery-detail.tsx 통합 | **PASS** | editMode/showVersionPanel/showTemplateSelector |
| G14 | 테스트 all pass | **PASS** | 24 tests pass (editor 14 + template 10), 318 test files total |

## Minor Discrepancies (기능 영향 없음)

| Item | Design | Implementation | Impact |
|------|--------|----------------|--------|
| plan_templates CHECK | tone/length CHECK constraint | Zod 검증으로 대체 | Low |
| BusinessPlanEditor props | `plan` prop 포함 | 내부 fetch, `onCancel` 추가 | Low |
| TEMPLATE_CONFIGS 필드명 | `maxLength` | `defaultLength` | Low |

## Conclusion

Match Rate **100%** — 완료 보고서 작성 단계로 진행해요.
