---
code: FX-RPRT-S138
title: "Sprint 138 — F321 TinaCMS 네비게이션 동적 관리 Report"
version: "1.0"
status: Active
category: RPRT
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 138
f_items: [F321]
---

# FX-RPRT-S138 — TinaCMS 네비게이션 동적 관리 완료 보고서

## Executive Summary

| 항목 | 값 |
|------|-----|
| Feature | F321 TinaCMS 네비게이션 동적 관리 |
| Sprint | 138 |
| Match Rate | 100% (10/10) |
| 변경 파일 | 9개 (수정 4 + 신규 5) |
| 테스트 | 330 pass / 0 fail / 0 skip |

### Value Delivered

| 관점 | 설명 |
|------|------|
| Problem | 사이드바 메뉴와 랜딩 섹션 순서가 코드에 하드코딩되어 비개발자가 변경 불가 |
| Solution | TinaCMS content 파일(JSON/MD)로 메뉴 구조와 섹션 순서를 관리 |
| Function UX Effect | /admin에서 Navigation 컬렉션 편집 → PR → 재배포로 메뉴 변경 가능 |
| Core Value | 비개발자 자율 관리 — 메뉴 추가/순서변경/숨김이 CMS 편집만으로 가능 |

## 구현 상세

### 1. Navigation CMS Collection
- `tina/config.ts`에 navigation JSON collection 추가
- topItems / processGroups / bottomItems 3-level 구조
- 각 항목에 visible, sortOrder 필드로 표시 제어

### 2. sidebar.json 초기 데이터
- 기존 sidebar.tsx 하드코딩 메뉴를 JSON으로 100% 이관
- 6개 프로세스 그룹 + 4개 상단 + 3개 하단 항목

### 3. Navigation Loader
- `src/lib/navigation-loader.ts` — JSON import + LucideIcon 매핑
- 38개 아이콘 레지스트리, fallback으로 HelpCircle 사용

### 4. Sidebar CMS + Fallback 패턴
- CMS 데이터 있으면 → filter(visible) + sort(sortOrder) + map(icon)
- CMS 데이터 없으면 → DEFAULT_* 하드코딩 상수 사용 (기존 동작 보존)

### 5. Landing Section 동적 정렬
- 9개 섹션을 독립 컴포넌트로 추출 (HeroSection ~ CtaSection)
- content/landing/*.md의 sort_order → Section Registry로 정렬
- 기존 순서를 DEFAULT_SECTION_ORDER로 보존
