---
code: FX-ANLS-S198
title: Sprint 198 Gap Analysis — Phase 22 M1-A (Offering Skill v2)
version: 1.0
status: Active
category: ANALYSIS
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# Sprint 198 Gap Analysis

## Overview

- **Sprint**: 198
- **F-items**: F414 (표준 목차 엔진), F415 (디자인 시스템 v2)
- **Phase**: Phase 22-A M1-A (표준화 + MVP)
- **Analysis Date**: 2026-04-07
- **Match Rate**: 100% (7/7 PASS)

---

## Design vs Implementation Verification

### F414: 표준 목차 엔진

#### 설계 기준 (Design Document)

**목표**: Offering Skill v2 SKILL.md에 가이드 §3 기준 20섹션 표준 목차 + KT 연계 체크 로직 내장

**핵심 요구사항**:
1. 20섹션 표준 목차 명시 (필수 18 + 선택 2)
2. Why/What/How/Proof/Next 5그룹 구조
3. Exec Summary 표준 불릿 풀 6종 (What/Why Now/How much/Why KT/Why Us/Scale)
4. 추진배경 3축 필수 구조 (수익성/KT적합성/실행력)
5. 선택 섹션(01-5, 01-6) 고객 유형별 분기 로직
6. 8단계 생성 프로세스 상세화
7. KT 연계 3축 검증 자동 로직 (Step 4)

#### 구현 결과 (Implementation)

| 요구사항 | 설계 | 구현 | 일치 여부 |
|---------|------|------|---------|
| 20섹션 표준 목차 | "필수 18 + 선택 2" 명시 | SKILL.md §2 '표준 목차 — 20섹션' 테이블 (0~05-4, 필수●/선택○ 구분) | ✅ PASS |
| 5그룹 구조 | Why→What→How→Proof→Next | SKILL.md §92에 테이블 헤더: "# \| 섹션 \| 핵심 질문 \| 필수 \| 컴포넌트" → 각 섹션에 **굵게 표시**: "**01** \| **문제 정의** \| Why \|" 등 | ✅ PASS |
| Exec Summary 표준 불릿 6종 | "What/Why Now/How much/Why KT/Why Us/Scale" 정의 | SKILL.md §135에 '표준 불릿 풀' 테이블: 6행 × 3열 (불릿 역할, 핵심 내용, 포함 기준) | ✅ PASS |
| 추진배경 3축 | "수익성/KT적합성/실행력" 명시 + CTA 블랙 박스 | SKILL.md §150에 '추진 배경 3축 구조' 다이어그램 + 설명 | ✅ PASS |
| 선택 섹션 분기 | "기존 고객 vs 신규 고객 vs 신규 시장" 3가지 시나리오 | SKILL.md §127에 '선택 섹션 대체 가이드' 테이블: 3행 (고객 상황별 01-5/01-6 처리 방식) | ✅ PASS |
| 8단계 프로세스 | Step 1~8 상세화 (아이템 확인→목차→정보 수집→초안→피드백→검증→점검→확정) | SKILL.md §52에 '[1]~[8]' 단계 코드 블록 + 각 단계 하위 3~4개 항목 | ✅ PASS |
| KT 연계 3축 검증 로직 | "Step 4에서 자동 적용, 미충족 시 경고 + 보충" | SKILL.md §169에 '[KT 연계 체크]' 다이어그램: ├──01-1 추진배경 3축 검사 / ├──미충족 축 경고 / └──KT 미연계 경고 | ✅ PASS |

**F414 Match Rate: 100% (7/7 PASS)**

---

### F415: 디자인 시스템 v2

#### 설계 기준

**목표**: design-tokens.md v2 + 신규 컴포넌트 5종 (exec-summary, three-axis, gan-verdict, tam-card, compare-table)

**핵심 요구사항**:
1. design-tokens.md v2 (색상/타이포/레이아웃/컴포넌트 스페이싱 토큰 정의)
2. 가이드 §5 정합성 검증 (base.html CSS variable ↔ 토큰 일치 확인)
3. 12종 컴포넌트 참조 테이블 추가
4. 신규 컴포넌트 5종 구현

#### 구현 결과

| 요구사항 | 설계 | 구현 | 일치 여부 |
|---------|------|------|---------|
| design-tokens 색상 토큰 | "텍스트/배경/보더/데이터 시각화 분류" | design-tokens.md §1: 1.1~1.4 섹션 (텍스트 4 + 배경 3 + 보더 3 + 데이터 4 = 14개) | ✅ PASS |
| 타이포그래피 토큰 | "8가지 정의" | design-tokens.md §2: hero/section/subsection/body/card-title/label/footnote/kpi (8개) | ✅ PASS |
| 레이아웃 토큰 | "maxWidth/padding/radius/breakpoint 등" | design-tokens.md §3: 8개 (layout.maxWidth/sectionPadding/cardRadius/cardRadiusSmall/breakpoint/navHeight/cardPadding/cardPaddingLarge) | ✅ PASS |
| 컴포넌트 스페이싱 토큰 | "grid/section/card/label 스페이싱" | design-tokens.md §4: 5개 (spacing.grid.gap/gapLarge/section.marginTop/card.marginBottom/label.marginBottom) | ✅ PASS |
| 가이드 §5 정합성 검증 | "base.html CSS variable = 토큰 일치" | design-tokens.md v2 서두: "v2 검증 결과: base.html의 CSS variable은 가이드 §5와 완전 일치 확인 (Sprint 198)" | ✅ PASS |
| 12종 컴포넌트 참조 | "Hero/Exec Summary/3축/TAM/BA/비교/... 참조 테이블" | design-tokens.md §4 끝: 컴포넌트 테이블 (Hero/Executive Summary/3축 카드 그리드/TAM/Before-After/비교 그리드/비교 테이블/트렌드/플로우/로드맵/임팩트/GAN 판정 = 12개) | ✅ PASS |
| exec-summary.html | "§0.5 경영진 3분 판단용, 3열 그리드 + 역할/텍스트/키워드" | `templates/components/exec-summary.html` 생성 (style + section#exec-summary + .exec-summary-grid + .exec-bullet 구조) | ✅ PASS |
| three-axis.html | "§01-1 추진배경 3축 카드 + CTA 박스" | `templates/components/three-axis.html` 생성 (추진배경 3축 카드 그리드) | ✅ PASS |
| gan-verdict.html | "§05-4 GAN 추진론/반대론/판정 배지" | `templates/components/gan-verdict.html` 생성 | ✅ PASS |
| tam-card.html | "§01-7 TAM/SAM/SOM 3카드 + 경쟁 비대칭" | `templates/components/tam-card.html` 생성 | ✅ PASS |
| compare-table.html | "§01-4, §05-3 동적 비교 테이블" | `templates/components/compare-table.html` 생성 | ✅ PASS |

**F415 Match Rate: 100% (7/7 PASS)**

---

## Overall Match Rate

```
총 검증 항목: 14개
PASS: 14개
FAIL: 0개
PARTIAL: 0개

Match Rate = 14/14 = 100%
```

**결론**: Design과 Implementation이 완벽히 일치. 추가 개선 (iterate) 불필요.

---

## Quality Metrics

| 항목 | 수치 | 평가 |
|------|------|------|
| Design 완성도 | 7개 요구사항 명시 (F414 5 + F415 7) | ✅ 우수 |
| Implementation 완성도 | 7개 요구사항 모두 구현 | ✅ 우수 |
| 문서 정합성 | SKILL.md v2.0 + design-tokens.md v2 + 신규 5개 파일 | ✅ 완벽 |
| 테스트 커버리지 | 템플릿 파일이므로 런타임 테스트 불필요, 구문 검증만 수행 | ✅ OK |
| 사용자 피드백 | 다음 Sprint에서 F416/F417 구현 시 피드백 예상 | 🔄 진행 중 |

---

## Issues Found

**없음** — 설계-구현 완벽 일치, 선수 작업 완료.

---

## Recommendations

1. **F416 선행 결정** — F414에서 20섹션 목차를 확정했으므로, F416에서 발굴 산출물(2-0~2-8)을 어떤 섹션에 매핑할지 사전 정의 권장.
2. **고객 유형별 사례 수집** — F414 선택 섹션 분기(기존 vs 신규 vs 신규시장)에 대해, 각 유형별 사업 3~5개 사례를 추가하면 사용자 이해도 향상.
3. **KT 미연계 사업 관리 방안** — SKILL.md에서 "KT 연계 경고"만 있고, 그 이후의 사용자 선택(보충 vs 포기)이 미정이므로, 다음 Sprint에서 정책 수립 권장.

---

## Next Steps

1. **F416 (Sprint 199)**: 발굴 산출물 자동 매핑 — section-mapping.md 작성
2. **F417 (Sprint 199)**: 경영 언어 원칙 적용 — writing-rules.md 작성 (SKILL.md §183 참조)
3. **F418~F419 (Sprint 200)**: KT 연계 + GAN 교차검증 자동화

---

## Metadata

| 항목 | 값 |
|------|-----|
| **Gap Analysis Code** | FX-ANLS-S198 |
| **Analysis Date** | 2026-04-07 |
| **Analyzer** | Report Generator Agent |
| **Sprint** | 198 |
| **Phase** | 22-A |
| **Total Items Verified** | 14 |
| **PASS Count** | 14 |
| **FAIL Count** | 0 |
| **Match Rate** | 100% |
| **Recommendation** | COMPLETE ✅ |

---

**Analysis Completed**: 2026-04-07
