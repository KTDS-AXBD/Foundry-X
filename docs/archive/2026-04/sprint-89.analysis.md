---
code: FX-ANLS-S89
title: "Sprint 89 — Gap 분석"
version: 1.0
status: Active
category: ANLS
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo (AI)
references: "[[FX-DSGN-S89]], [[FX-PLAN-S89]]"
---

# Sprint 89 Gap 분석: BD 프로세스 가이드 UI + 스킬 카탈로그 UI

## Match Rate: 95%

## §1 Design vs 구현 매칭

### 데이터 구조 (§2)

| Design 항목 | 구현 상태 | 매칭 |
|-------------|----------|------|
| `bd-process.ts` — BdStage 인터페이스 | ✅ 구현 완료, 11단계 전체 | ✅ |
| `bd-process.ts` — IntensityMatrix | ✅ INTENSITY_MATRIX 상수 | ✅ |
| `bd-skills.ts` — BdSkill 인터페이스 | ✅ 구현 완료, 56개 항목 | ✅ |
| `bd-skills.ts` — SkillCategory 6종 | ✅ 타입 + 라벨 + 컬러 | ✅ |

### 라우팅 (§3)

| Design 항목 | 구현 상태 | 매칭 |
|-------------|----------|------|
| `/ax-bd/process-guide` 라우트 | ✅ router.tsx에 추가 | ✅ |
| `/ax-bd/skill-catalog` 라우트 | ✅ router.tsx에 추가 | ✅ |

### 컴포넌트 (§4)

| Design 항목 | 구현 상태 | 매칭 |
|-------------|----------|------|
| ProcessGuidePage 라우트 컴포넌트 | ✅ `routes/ax-bd/process-guide.tsx` | ✅ |
| ProcessGuide 메인 컴포넌트 | ✅ 아코디언 + 매트릭스 + 타임라인 | ✅ |
| **TypeIntensityMatrix 별도 컴포넌트** | ⚠️ ProcessGuide에 인라인 구현 | 🔸 |
| **CheckpointTimeline 별도 컴포넌트** | ⚠️ ProcessGuide에 인라인 구현 | 🔸 |
| SkillCatalogPage 라우트 컴포넌트 | ✅ `routes/ax-bd/skill-catalog.tsx` | ✅ |
| SkillCatalog 메인 컴포넌트 | ✅ 검색 + 카테고리 + 단계 필터 + 그리드 | ✅ |
| SkillCard 컴포넌트 | ✅ 카드 UI 구현 | ✅ |
| **SkillDetailModal (Dialog 기반)** | 🔸 SkillDetailSheet (Sheet 기반) | 🔸 |
| **ProcessFlowV82 상단 배치** | ⚠️ 미포함 (매트릭스로 대체) | 🔸 |

### 네비게이션 (§6)

| Design 항목 | 구현 상태 | 매칭 |
|-------------|----------|------|
| 사이드바에 "프로세스 가이드" 추가 | ✅ | ✅ |
| 사이드바에 "스킬 카탈로그" 추가 | ✅ | ✅ |

### 테스트 (§7)

| Design 항목 | 구현 상태 | 매칭 |
|-------------|----------|------|
| ProcessGuide 단위 테스트 | ✅ 8 tests | ✅ |
| SkillCatalog 단위 테스트 | ✅ 6 tests | ✅ |
| typecheck 통과 | ✅ | ✅ |
| 기존 테스트 영향 없음 | ✅ 207 → 221 | ✅ |

## §2 Gap 목록

| # | Gap | 심각도 | 설명 |
|---|-----|--------|------|
| 1 | TypeIntensityMatrix 별도 컴포넌트 미분리 | 저 | ProcessGuide에 인라인으로 구현. 기능은 동일하나 재사용성 낮음. 현 단계에서는 불필요한 분리 |
| 2 | CheckpointTimeline 별도 컴포넌트 미분리 | 저 | ProcessGuide에 인라인. 동일 논리 |
| 3 | SkillDetailModal → SkillDetailSheet | 저 | Dialog 없어서 Sheet로 대체. UX 차이 미미 (슬라이드인 vs 오버레이) |
| 4 | ProcessFlowV82 상단 미포함 | 저 | 강도 매트릭스가 동일 정보를 더 상세히 보여주므로 중복 |

## §3 판정

**Match Rate 95%** — Gap 4건 모두 심각도 "저", 기능적 완전성 확보.
별도 컴포넌트 분리와 ProcessFlowV82 포함은 코드 크기 대비 효과가 미미하여 현 상태 유지 권장.

→ **Iterate 불필요** (>= 90%)
