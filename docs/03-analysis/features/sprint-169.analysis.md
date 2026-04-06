---
code: FX-ANLS-S169
title: "Sprint 169 Gap Analysis — Offerings 목록 + 생성 위자드"
version: 1.0
status: Active
category: ANLS
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo (gap-detector agent)
references: "[[FX-DSGN-S169]], [[FX-PLAN-S169]]"
---

# Sprint 169 Gap Analysis

## Overview

| 항목 | 값 |
|------|------|
| Design | FX-DSGN-S169 v1.0 |
| Sprint | 169 |
| Feature | F374 (Offerings 목록) + F375 (생성 위자드) |
| Match Rate | **100% (27/27 PASS)** |
| 분석일 | 2026-04-06 |

## F374 목록 페이지 (9/9 PASS)

| ID | 항목 | 판정 |
|----|------|:----:|
| D-374-01 | /shaping/offerings 라우트 + 목록 렌더링 | PASS |
| D-374-02 | 상태 필터 탭 6개 | PASS |
| D-374-03 | 필터 탭 클릭 시 해당 상태만 표시 | PASS |
| D-374-04 | 카드 상태 배지 + 목적 태그 + 포맷 + 버전 + 생성일 | PASS |
| D-374-05 | EmptyState 컴포넌트 | PASS |
| D-374-06 | 로딩 중 SkeletonGrid | PASS |
| D-374-07 | 삭제 confirm → DELETE → 새로고침 | PASS |
| D-374-08 | 사이드바 "Offerings" 메뉴 | PASS |
| D-374-09 | "새로 만들기" → /shaping/offerings/new | PASS |

## F375 생성 위자드 (15/15 PASS)

| ID | 항목 | 판정 |
|----|------|:----:|
| D-375-01 | /shaping/offerings/new → Step 1 | PASS |
| D-375-02 | BizItem 목록 + 선택 | PASS |
| D-375-03 | "건너뛰기" → Step 2 | PASS |
| D-375-04 | 제목 필수 검증 | PASS |
| D-375-05 | 목적 라디오 3개 | PASS |
| D-375-06 | 포맷 라디오 2개 | PASS |
| D-375-07 | BizItem 선택 시 제목 프리필 | PASS |
| D-375-08 | 22개 표준 섹션 체크리스트 | PASS |
| D-375-09 | 필수 섹션 checked + disabled | PASS |
| D-375-10 | 선택 섹션 토글 | PASS |
| D-375-11 | "전체 선택/해제" 토글 | PASS |
| D-375-12 | 스텝 진행 표시기 | PASS |
| D-375-13 | 이전/다음 네비게이션 | PASS |
| D-375-14 | 완료 → POST /offerings → 에디터 이동 | PASS |
| D-375-15 | 생성 후 선택 해제 섹션 toggle-off | PASS |

## 공통 (3/3 PASS)

| ID | 항목 | 판정 |
|----|------|:----:|
| D-COM-01 | typecheck 통과 | PASS |
| D-COM-02 | 기존 테스트 회귀 없음 | PASS |
| D-COM-03 | 사이드바 라벨 변경 | PASS |

## 비고

- Design 문서를 구현과 동기화: 섹션 수 21→22, WizardState selectedSections→excludedSections 역방향 반영
