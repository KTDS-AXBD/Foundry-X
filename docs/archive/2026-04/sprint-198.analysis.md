---
code: FX-ANLS-S198
title: Sprint 198 Gap Analysis — Phase 22 M1-A (Offering Skill v2 표준화)
version: 1.0
status: Active
category: ANALYSIS
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# Sprint 198 Gap Analysis

## Overview

| 항목 | 값 |
|------|-----|
| Sprint | 198 |
| Phase | Phase 22-A (표준화 + MVP) |
| Features | F414 (표준 목차 엔진), F415 (디자인 시스템 v2) |
| Design 문서 | FX-DSGN-S198 |
| 분석 일시 | 2026-04-07 |
| **Match Rate** | **100% (16/16 PASS)** |

---

## F414: 표준 목차 엔진 (8/8 PASS)

| ID | 요구사항 | Design 기준 | 구현 위치 | 판정 |
|----|---------|------------|----------|------|
| F414-R1 | 20섹션 표준 목차 테이블 | §2 테이블 (20행 × 5열) | SKILL.md L92~L124 | ✅ PASS |
| F414-R2 | 5그룹 구조 (Why→What→How→Proof→Next) | 논리 흐름 명시 | SKILL.md L92 테이블 그룹 헤더 (§01~§05) | ✅ PASS |
| F414-R3 | Exec Summary 표준 불릿 6종 + 작성 원칙 | §135 테이블 | SKILL.md L135~L148 (6역할 테이블 + 원칙) | ✅ PASS |
| F414-R4 | 추진배경 3축 구조 (다이어그램 + 설명) | §150 ASCII 다이어그램 | SKILL.md L150~L167 (3축 다이어그램 + CTA 블랙박스) | ✅ PASS |
| F414-R5 | 선택 섹션 고객 유형별 분기 (3시나리오) | §127 테이블 | SKILL.md L127~L133 (3행 분기 테이블) | ✅ PASS |
| F414-R6 | 8단계 프로세스 상세화 | §52 코드 블록 | SKILL.md L52~L90 (Step 1~8 플로우) | ✅ PASS |
| F414-R7 | KT 연계 3축 자동 검증 로직 | §169 플로우 다이어그램 | SKILL.md L169~L181 (3축 검사 + 경고 플로우) | ✅ PASS |
| F414-R8 | 경영 언어 원칙 10항목 | §187 테이블 | SKILL.md L187~L201 (10행 × 4열 테이블) | ✅ PASS |

---

## F415: 디자인 시스템 v2 (8/8 PASS)

| ID | 요구사항 | Design 기준 | 구현 위치 | 판정 |
|----|---------|------------|----------|------|
| F415-R1 | design-tokens.md v2 (30개 토큰) | §1~§4 (14+8+8+5) | design-tokens.md §1~§4 (35개: 30+5 animation) | ✅ PASS |
| F415-R2 | 가이드 §5 정합성 검증 + 기록 | 서두 검증 문구 | design-tokens.md L9 "v2 검증 결과" | ✅ PASS |
| F415-R3 | 12종 컴포넌트 참조 테이블 | §4 테이블 | design-tokens.md §6 (12행 참조 테이블) | ✅ PASS |
| F415-R4 | exec-summary.html (§0.5) | 3열 그리드, 반응형 | templates/components/exec-summary.html (67줄) | ✅ PASS |
| F415-R5 | three-axis.html (§01-1) | 3열 카드 + CTA 블랙박스 | templates/components/three-axis.html (122줄) | ✅ PASS |
| F415-R6 | gan-verdict.html (§05-4) | 추진론/반대론/판정 배지 | templates/components/gan-verdict.html (192줄) | ✅ PASS |
| F415-R7 | tam-card.html (§01-7) | TAM/SAM/SOM 3카드 | templates/components/tam-card.html (175줄) | ✅ PASS |
| F415-R8 | compare-table.html (§01-4, §05-3) | 동적 비교 테이블 | templates/components/compare-table.html (77줄) | ✅ PASS |

---

## 상세 검증

### 컴포넌트 품질 체크

| 컴포넌트 | HTML 구문 | CSS 토큰 참조 | 템플릿 변수 | 반응형 | 주석 |
|---------|----------|-------------|-----------|-------|------|
| exec-summary.html | ✅ | ✅ (--gray-50, --card-radius) | ✅ ({{bullets[]}}) | ✅ (900px) | ✅ |
| three-axis.html | ✅ | ✅ (--gray-200, --black) | ✅ ({{axis[]}}, {{keywords[]}}) | ✅ (900px) | ✅ |
| gan-verdict.html | ✅ | ✅ (--green, --red, --orange) | ✅ ({{questions[]}}) | ✅ (900px) | ✅ |
| tam-card.html | ✅ | ✅ (--black, --gray-400) | ✅ ({{tam/sam/som}}) | ✅ (900px) | ✅ |
| compare-table.html | ✅ | ✅ (.compare-table) | ✅ ({{headers[], rows[]}}) | — (테이블) | ✅ |

### Design 대비 초과 구현 (긍정적)

1. **design-tokens.md**: Design에서 30개 토큰 요구 → 실제 35개 구현 (Animation Tokens 5개 추가: §5)
2. **gan-verdict.html**: Design의 단순 3열 카드 구조 → 실제 질문별 반복 카드 + 요약 배지 행 (더 풍부한 UX)
3. **tam-card.html**: Design의 기본 3카드 → 실제 경쟁 비대칭 가설 블록 추가 (§01-7 완성도 향상)
4. **SKILL.md**: 교차검증 체크리스트 10항목 추가 (§256~§265, Design에 미명시)

---

## 결론

| 지표 | 결과 |
|------|------|
| **Match Rate** | **100% (16/16)** |
| F414 | 8/8 PASS |
| F415 | 8/8 PASS |
| 초과 구현 | 4건 (긍정적 — 품질 향상) |
| 미구현 | 0건 |
| **판정** | **PASS — Report 단계 진행** |
