---
code: FX-PLAN-S198
title: Sprint 198 Plan — Phase 22 M1-A (Offering Skill v2 표준화)
version: 1.0
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# Sprint 198 Plan

## Overview

- **Sprint**: 198
- **Phase**: Phase 22-A (표준화 + MVP)
- **Duration**: 1 Sprint (~2일 예정)
- **Owner**: Sinclair Seo
- **Objective**: Phase 22 M1-A 기초 구조 완성 — Offering Skill v2 표준 목차 엔진 + 디자인 시스템 v2
- **Success Criteria**: Match Rate 90%+ (목표 100%)

---

## Executive Summary

### 1.3 Value Delivered (4관점)

| 관점 | 내용 |
|------|------|
| **Problem** | 사업기획서 작성 프로세스가 수동이고 비체계적이며, KT 연계 여부를 자동으로 검증할 수 없어 부실 제안이 올라갈 위험이 높다. |
| **Solution** | Offering Skill v2에 가이드 §3 기준 20섹션 표준 목차 + KT 연계 3축 자동 검증 + 표준 불릿 풀 6종 + 신규 컴포넌트 5종을 내장하여, 초안 생성부터 최종 확정까지 자동화한다. |
| **Function/UX Effect** | 표준 목차로 기획서 구조 통일 (20섹션 자동 제시) | KT 연계 3축 체크로 부실 제안 자동 차단 (경고 + 보충) | 고객 유형별 섹션 선택 분기 (기존/신규/신규시장) | 8단계 생성 프로세스 자동화로 수작업 70% 단축. |
| **Core Value** | KT 연계 불명확한 사업 제안 사전 차단 → 본부장 보고 품질 향상 → 사업성 평가 신뢰도 +40% 기대 | 표준화된 목차와 디자인으로 그룹 간 제안서 비교 가능화 → 의사결정 속도 20% 단축 기대. |

---

## Scope

### In Scope

#### F414: 표준 목차 엔진
- **목표**: Offering Skill v2 SKILL.md에 가이드 §3 기준 20섹션 표준 목차 + KT 연계 체크 로직 구현
- **주요 작업**:
  1. 20섹션 표준 목차 정의 (필수 18 + 선택 2)
  2. Why/What/How/Proof/Next 5그룹 논리 구조 명시
  3. Exec Summary 표준 불릿 풀 6종 정의 (What/Why Now/How much/Why KT/Why Us/Scale)
  4. 추진배경 3축 필수 구조 (수익성/KT적합성/실행력)
  5. 선택 섹션(01-5, 01-6) 고객 유형별 분기 가이드
  6. 8단계 생성 프로세스 상세화 (Step 1~8)
  7. KT 연계 원칙 체크 (Step 4: 3축 검증 자동 로직)
  8. 경영 언어 원칙 10항목 명시 (가능형 금지, 최초 표현 금지 등)

#### F415: 디자인 시스템 v2
- **목표**: design-tokens.md v2 + 신규 컴포넌트 5종으로 Offering Skill의 시각 일관성 확보
- **주요 작업**:
  1. design-tokens.md v2 작성 (30개 토큰: 색상 14 + 타이포 8 + 레이아웃 8)
  2. 가이드 §5 정합성 검증 (base.html CSS variable ↔ 토큰)
  3. 12종 컴포넌트 참조 테이블 추가 (기존 7종 + 신규 5종)
  4. 신규 컴포넌트 5종 구현:
     - exec-summary.html (§0.5 경영진 3분 판단)
     - three-axis.html (§01-1 추진배경 3축)
     - gan-verdict.html (§05-4 GAN 교차검증)
     - tam-card.html (§01-7 TAM/SAM/SOM)
     - compare-table.html (§01-4, §05-3 동적 비교 테이블)

### Out of Scope

- ❌ F416 (발굴 산출물 자동 매핑) — Sprint 199
- ❌ F417 (경영 언어 원칙 적용 스킬) — Sprint 199
- ❌ F418~F419 (KT 연계 강화) — Sprint 200
- ❌ 실제 사업기획서 예시 생성 (다음 Sprint F416과 함께)
- ❌ 웹 UI 에디터 (Phase 22-C Sprint 173 이후)

---

## Requirements

### Functional Requirements

| ID | 요구사항 | 우선순위 | 검증 방법 |
|----|---------|---------|----------|
| F414-R1 | 20섹션 표준 목차 테이블 작성 | P0 | SKILL.md §2 확인 |
| F414-R2 | 5그룹 구조(Why→What→How→Proof→Next) 명시 | P0 | 섹션 그룹핑 확인 |
| F414-R3 | Exec Summary 표준 불릿 6종 + 작성 원칙 | P0 | SKILL.md §135 테이블 |
| F414-R4 | 추진배경 3축 구조 (다이어그램 + 설명) | P0 | SKILL.md §150 |
| F414-R5 | 선택 섹션 고객 유형별 분기 (3가지 시나리오) | P1 | SKILL.md §127 테이블 |
| F414-R6 | 8단계 프로세스 상세화 | P0 | SKILL.md §52 코드 블록 |
| F414-R7 | KT 연계 3축 자동 검증 로직 | P0 | SKILL.md §169 플로우 |
| F414-R8 | 경영 언어 원칙 10항목 명시 | P0 | SKILL.md §187 테이블 |
| F415-R1 | design-tokens.md v2 (30개 토큰) | P0 | design-tokens.md 파일 |
| F415-R2 | 가이드 §5 정합성 검증 + 기록 | P0 | design-tokens.md 서두 검증 문구 |
| F415-R3 | 12종 컴포넌트 참조 테이블 | P0 | design-tokens.md §4 |
| F415-R4 | 신규 컴포넌트 5종 (exec-summary) | P0 | templates/components/exec-summary.html |
| F415-R5 | 신규 컴포넌트 5종 (three-axis) | P0 | templates/components/three-axis.html |
| F415-R6 | 신규 컴포넌트 5종 (gan-verdict) | P0 | templates/components/gan-verdict.html |
| F415-R7 | 신규 컴포넌트 5종 (tam-card) | P0 | templates/components/tam-card.html |
| F415-R8 | 신규 컴포넌트 5종 (compare-table) | P0 | templates/components/compare-table.html |

### Non-Functional Requirements

| 요구사항 | 기준 | 검증 |
|---------|------|------|
| 문서 완성도 | SKILL.md/design-tokens.md 모두 v1 → v2 상향 | changelog 갱신 확인 |
| 코드 정합성 | Design과 Implementation 100% 매칭 | Gap Analysis Match Rate 90%+ |
| 다음 Sprint 호환성 | F416/F417 선행 조건 충족 | 섹션 매핑/경영 언어 참조 가능 확인 |
| 가이드 기반 설계 | Phase 22 공식 가이드 §0~§5 준용 | 공식 가이드 인용 명시 |

---

## Implementation Plan

### Phase 1: 요구사항 수집 & 설계 (Day 1 오전)

**목표**: F414/F415 설계 확정 및 구현 체크리스트 작성

**작업**:
1. Phase 22 공식 가이드(§3, §5) 재검토
2. SKILL.md v1 → v2 마이그레이션 계획 (기존 내용 보존 + 새 섹션 추가)
3. design-tokens.md 토큰 정의 리스트 작성 (30개)
4. 신규 컴포넌트 5종 스펙 정리
5. F416/F417/F418 선행 조건 리스트 확인

**산출물**:
- Sprint 198 Plan 문서 (이 문서)
- Design Document (sprint-198.design.md)

### Phase 2: F414 구현 (Day 1 오후 ~ Day 2 오전)

**목표**: SKILL.md v2.0 완성

**작업 순서**:
1. SKILL.md 파일 열기 → v1.0 백업
2. frontmatter 갱신: version "2.0", sprint 198, changelog 추가
3. §2 "표준 목차 — 20섹션" 테이블 작성 (필수/선택 구분)
4. §52 "How (8단계 프로세스)" 상세화
5. §92 제목 + 테이블 (5그룹 구조 명시)
6. §127 "선택 섹션 대체 가이드" 테이블 추가
7. §135 "Exec Summary 표준 불릿 풀" 테이블 + 작성 원칙
8. §150 "추진 배경 3축 구조" 다이어그램 + 설명
9. §169 "KT 연계 원칙 체크" 플로우 다이어그램
10. §183 "경영 언어 원칙" 10항목 테이블

**검증**:
- SKILL.md 구문 정상 (마크다운 파싱)
- 모든 요구사항 F414-R1~R8 포함 확인
- 테이블/다이어그램 가독성 검사

**산출물**:
- `.claude/skills/ax-bd/shape/offering-html/SKILL.md` v2.0

### Phase 3: F415 구현 (Day 2 오전)

**목표**: design-tokens.md v2 + 신규 컴포넌트 5종 완성

#### 3-1: design-tokens.md v2 작성

**작업**:
1. design-tokens.md 파일 열기 → v2 백업
2. frontmatter 갱신: v2 (Sprint 198)
3. 서두: "v2 검증 결과: base.html CSS variable = 가이드 §5 완전 일치" 명시
4. §1 "Color Tokens" — 색상 14개 정의
   - 1.1 텍스트 4개
   - 1.2 배경 3개
   - 1.3 보더 3개
   - 1.4 데이터 4개
5. §2 "Typography Tokens" — 타이포 8개 정의
6. §3 "Layout Tokens" — 레이아웃 8개 정의
7. §4 "Component Spacing Tokens" — 스페이싱 5개 정의
8. 각 토큰 테이블: Token | CSS Variable | Value | 용도

**검증**:
- 30개 토큰 모두 명시 확인
- CSS variable 명명 규칙 일관성 확인
- base.html과 정합성 검증 (선택 항목 스키핑, 문서 기록만)

**산출물**:
- `.claude/skills/ax-bd/shape/offering-html/design-tokens.md` v2

#### 3-2: 신규 컴포넌트 5종 구현

**각 컴포넌트별 작업**:

1. **exec-summary.html** (§0.5)
   - 3열 그리드 레이아웃
   - 불릿 카드: 역할 라벨 + 텍스트 + 강조 키워드
   - 반응형: 900px 이하 1열
   - 변수: {{bullets[]}} 루프

2. **three-axis.html** (§01-1)
   - 3열 카드 그리드 (수익성/KT적합성/실행력)
   - 각 카드: 제목 + 설명 + 아이콘
   - 하단: CTA 블랙박스 (추진 목적)
   - 변수: {{axes[]}} with title, description, keyword[]

3. **gan-verdict.html** (§05-4)
   - 3열 카드 그리드 (추진론/반대론/판정)
   - 색상: green/red/amber 배지
   - 변수: {{verdict}} with pros[], cons[], decision, confidence

4. **tam-card.html** (§01-7)
   - 3열 카드 (TAM/SAM/SOM)
   - 각 카드: 라벨 + 큰 수치 + 설명
   - 변수: {{tam, sam, som}} with value, unit, description

5. **compare-table.html** (§01-4, §05-3)
   - thead: 비교 항목 열 (항목명, 우리, 경쟁사A, 경쟁사B...)
   - tbody: 각 행별 비교
   - 강조: green(강점)/red(약점) 배경
   - 변수: {{rows[]}} with item, columns[]

**검증 체크리스트** (각 컴포넌트):
- ✅ HTML 구문 정상
- ✅ CSS class 명명 규칙 (design-tokens 토큰 참조)
- ✅ 템플릿 변수 {{}} 문법 정상
- ✅ 주석으로 목적/변수 설명 포함

**산출물**:
```
templates/components/
├── exec-summary.html (신규)
├── three-axis.html (신규)
├── gan-verdict.html (신규)
├── tam-card.html (신규)
└── compare-table.html (신규)
```

### Phase 4: 통합 & 검증 (Day 2 오후)

**목표**: Sprint 198 PDCA 완료 (Plan → Design → Do → Check → Act)

**작업**:
1. PDCA 문서 작성
   - Design Document (sprint-198.design.md)
   - Gap Analysis (sprint-198-gap.md) — Match Rate 확인
   - Completion Report (sprint-198.report.md)

2. SPEC.md 업데이트
   - F414/F415 상태 🔧 → ✅
   - Phase 22 마일스톤 진행 현황 반영

3. Git 커밋
   - 메시지: "feat: F414~F415 (Phase 22 M1-A) — Offering Skill v2 표준화"
   - 포함 파일: SKILL.md, design-tokens.md, 5개 컴포넌트, 4개 PDCA 문서

**산출물**:
- `docs/01-plan/features/sprint-198.plan.md`
- `docs/02-design/features/sprint-198.design.md`
- `docs/03-analysis/sprint-198-gap.md`
- `docs/04-report/features/sprint-198.report.md`

---

## Timeline

| 단계 | 작업 | 예상 시간 | 담당 |
|------|------|---------|------|
| P1 | 요구사항 수집 & 설계 | 2h | Sinclair |
| P2 | F414 SKILL.md v2 구현 | 4h | Sinclair |
| P3-1 | F415 design-tokens.md v2 | 2h | Sinclair |
| P3-2 | F415 신규 컴포넌트 5종 | 3h | Sinclair |
| P4 | 통합 & 검증 & 문서 | 2h | Sinclair |
| **총** | | **13h** | |

**예상 소요 기간**: 2일 (Day 1: 6h, Day 2: 7h)

---

## Risks & Mitigation

| 위험 | 확률 | 영향 | 대응 |
|------|------|------|------|
| F416 매핑 기준 미정 | 중 | 높음 | F414에서 20섹션을 명확하게 정의하여, F416에서 참조만 하도록 구조화 |
| 경영 언어 원칙 스킬 미완 | 낮음 | 중간 | F417에서 상세화, F414에서는 10항목 리스트만 제공 |
| 디자인 토큰 base.html 불일치 | 낮음 | 높음 | 기존 KOAMI v0.5 기준으로 정합성 검증, 필요시 base.html 조정 |
| 신규 컴포넌트 렌더링 테스트 부족 | 낮음 | 낮음 | 다음 Sprint F416에서 실제 데이터로 테스트, 현재는 구문 검증만 |

---

## Success Criteria

| 기준 | 목표 | 판정 |
|------|------|------|
| F414 완성도 | 8개 요구사항 (R1~R8) 모두 구현 | 8/8 |
| F415 완성도 | 8개 요구사항 (R1~R8) 모두 구현 | 8/8 |
| Match Rate | 90% 이상 (목표 100%) | 100% 달성 시 우수 |
| 문서 정합성 | SKILL.md/design-tokens.md 모두 v2.0 상향 | ✅ |
| 다음 Sprint 준비 | F416/F417 선행 조건 충족 | ✅ |

---

## Deliverables

### 코드 산출물
- ✅ `.claude/skills/ax-bd/shape/offering-html/SKILL.md` (v2.0)
- ✅ `.claude/skills/ax-bd/shape/offering-html/design-tokens.md` (v2)
- ✅ `templates/components/exec-summary.html`
- ✅ `templates/components/three-axis.html`
- ✅ `templates/components/gan-verdict.html`
- ✅ `templates/components/tam-card.html`
- ✅ `templates/components/compare-table.html`

### 문서 산출물
- ✅ `docs/01-plan/features/sprint-198.plan.md`
- ✅ `docs/02-design/features/sprint-198.design.md`
- ✅ `docs/03-analysis/sprint-198-gap.md`
- ✅ `docs/04-report/features/sprint-198.report.md`

### 메타데이터
- ✅ SPEC.md (F414/F415 상태 갱신)
- ✅ Git commit message
- ✅ Phase 22 로드맵 진행 현황

---

## Dependencies

### 선행 작업
- ✅ Phase 22 공식 가이드 (§0~§5) 확정 — 세션 #216 완료
- ✅ Offering Skill v1 (F365) 기초 구현 완료

### 후행 작업
- 📋 F416 (Sprint 199): section-mapping.md 작성 — F414 20섹션 참조
- 📋 F417 (Sprint 199): writing-rules.md 작성 — F414 경영 언어 원칙 참조
- 📋 F418~F419 (Sprint 200): KT 연계 강화 — F414 3축 검증 로직 활용

---

## Notes

1. **가이드 기반 설계**: Phase 22 공식 가이드(§0~§5)를 설계의 SSOT(Single Source of Truth)로 사용하여, Design과 Implementation의 정합성을 최대화한다.

2. **다음 Sprint 호환성**: F416에서 발굴 산출물(2-0~2-8)을 섹션에 자동 매핑하려면, F414에서 20섹션의 정의가 명확해야 한다. 따라서 SKILL.md §2의 목차 테이블에 "포함 기준" 또는 "매핑 예시"를 최대한 상세히 기술한다.

3. **경영 언어 원칙 분리**: 10항목의 경영 언어 원칙은 SKILL.md에서 참조만 하고, 실제 스킬 로직 구현(자동 검사)은 F417에서 수행한다. F414는 "원칙 정의", F417은 "원칙 적용"의 역할 분담.

4. **컴포넌트 재사용**: 신규 5종 컴포넌트를 추가하면서도, 기존 7종 컴포넌트는 그대로 유지하여 호환성 최대화.

---

**Plan Created**: 2026-04-07  
**Version**: 1.0  
**Status**: Active
