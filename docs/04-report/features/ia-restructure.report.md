---
code: FX-RPRT-IA
title: "IA 구조 개선 완료 보고서 — Sprint 82~84 (F241~F244)"
version: 1.0
status: Active
category: RPRT
created: 2026-03-30
updated: 2026-03-30
author: Sinclair Seo
---

# Foundry-X IA 구조 개선 — 완료 보고서

> **Feature**: ia-restructure
> **Sprint**: 82~84 (F241~F244)
> **Author**: Sinclair Seo
> **Date**: 2026-03-30
> **Status**: Completed

---

## Executive Summary

| 항목 | 내용 |
|------|------|
| **Feature** | IA 구조 개선 (사이드바 + 온보딩 + UI/UX) |
| **기간** | 2026-03-30 (단일 세션) |
| **Sprint** | 82 (F241), 83 (F242+F243), 84 (F244) |
| **Match Rate** | 79% → **~93%** (Gap 해소 후) |

### Value Delivered

| Perspective | Content |
|-------------|---------|
| **Problem** | 사이드바가 개발자 관점으로 구성, Phase 7 페이지 4건 누락, Discovery 3곳 분산 |
| **Solution** | AX BD 프로세스 6단계 기반 사이드바 재구성 + 온보딩 가이드 + AXIS DS 색상 뱃지 |
| **Function/UX Effect** | 사이드바 노출 페이지 18→24개, 프로세스 동선 직관화, 신규 팀원 자기주도 학습 지원 |
| **Core Value** | "프로세스가 곧 네비게이션" — 도구 사용이 곧 프로세스 학습 |

---

## 1. 구현 결과

### 1.1 Sprint 82 — F241 사이드바 IA 재구조화

| 항목 | Before | After |
|------|--------|-------|
| 사이드바 그룹 구조 | SR관리/개발/현황/AX BD (4그룹) | 수집/발굴/형상화/검증/제품화/GTM (6단계) + 지식/관리/외부 |
| 사이드바 노출 페이지 | 18개 | **24개** |
| 누락 페이지 | pipeline, ir-proposals, offering-packs, mvp-tracking | **0개** (전부 통합) |
| Discovery 분산 | 3곳 | **1곳** (발굴 그룹) |
| 개발자 도구 위치 | 메인 동선 | **관리 그룹** 하위 |

**변경 파일**: `sidebar.tsx`, `OnboardingTour.tsx`

### 1.2 Sprint 83 — F242 온보딩 가이드 + F243 대시보드

| 항목 | 구현 |
|------|------|
| ProcessStageGuide | 경로 자동 감지 + localStorage dismiss + layout.tsx 전역 적용 |
| STAGES 데이터 | 6단계 정보 중앙 정의, 대시보드에서 재사용 |
| 대시보드 | 프로세스 파이프라인 진행률 (상단) + 퀵 액션 4개 + 기존 위젯 (하단) |
| ResetStageGuides | 가이드 초기화 컴포넌트 (설정에서 사용 가능) |

**신규 파일**: `ProcessStageGuide.tsx`
**변경 파일**: `layout.tsx`, `dashboard/page.tsx`

### 1.3 Sprint 84 — F244 AXIS DS 기반 UI/UX

| 항목 | 구현 |
|------|------|
| AXIS 색상 토큰 | globals.css에 indigo/rose 추가 (light + dark) |
| 단계 번호 뱃지 | stageColor prop → 원형 숫자 뱃지 (AXIS 색상) |
| 활성 단계 하이라이트 | 좌측 border 색상 변경 |
| 색상 매핑 | blue/violet/warm/green/indigo/rose (6색) |

**변경 파일**: `sidebar.tsx`, `globals.css`

---

## 2. 변경 파일 요약

| 파일 | Sprint | 유형 |
|------|--------|------|
| `packages/web/src/components/sidebar.tsx` | 82, 84 | 수정 |
| `packages/web/src/components/feature/OnboardingTour.tsx` | 82 | 수정 |
| `packages/web/src/components/feature/ProcessStageGuide.tsx` | 83 | **신규** |
| `packages/web/src/app/(app)/layout.tsx` | 83 | 수정 |
| `packages/web/src/app/(app)/dashboard/page.tsx` | 83 | 수정 |
| `packages/web/src/app/globals.css` | 84 | 수정 |
| `packages/web/e2e/dashboard.spec.ts` | Act | 수정 |
| `docs/01-plan/features/ia-restructure.plan.md` | Plan | 신규 |
| `docs/02-design/features/ia-restructure.design.md` | Design | 신규 |

---

## 3. 품질 검증

| 검증 항목 | 결과 |
|-----------|------|
| typecheck (tsc --noEmit) | ✅ 통과 |
| 라우트 변경 | 없음 (기존 URL 100% 유지) |
| E2E 테스트 | ✅ 프로세스 6단계 기준으로 갱신 |
| Match Rate | 79% → ~93% (Design 현행화 후) |

---

## 4. Scope-out 항목 (후속 Sprint)

| 항목 | 사유 | 권장 시점 |
|------|------|-----------|
| getting-started 6단계 플로우 차트 | 기존 5탭 구조 충분, 온보딩 피드백 후 결정 | F114 온보딩 킥오프 후 |
| Dashboard "최근 활동" 영역 | API 설계 필요, 현재 퀵 액션으로 대체 | 다음 Sprint |
| 카드 컴포넌트 리디자인 | 기존 shadcn/ui 일관성 유지 중 | AXIS DS 고도화 시 |

---

## 5. PDCA 흐름

```
[Plan] ✅ → [Design] ✅ → [Do] ✅ → [Check] ✅ 93% → [Act] ✅ → [Report] ✅
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-03-30 | 완료 보고서 작성 | Sinclair Seo |
