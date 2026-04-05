---
code: FX-PLAN-S138
title: "Sprint 138 — F321 TinaCMS 네비게이션 동적 관리"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 138
f_items: [F321]
---

# FX-PLAN-S138 — TinaCMS 네비게이션 동적 관리

## Executive Summary

| 항목 | 값 |
|------|-----|
| Feature | F321 TinaCMS 네비게이션 동적 관리 |
| Sprint | 138 |
| 우선순위 | P2 |
| 예상 소요 | ~6h |
| 변경 패키지 | web (tina config + content + sidebar + landing) |

## §1 목표

사이드바 메뉴와 랜딩 페이지 섹션의 순서/표시를 TinaCMS에서 관리 가능하게 전환. 비개발자가 `/admin`에서 메뉴 구조를 변경하면 GitHub PR이 자동 생성.

## §2 접근 방식

### 사이드바 메뉴
- TinaCMS `navigation` collection 생성 → `content/navigation/sidebar.json` 에 메뉴 순서/가시성 정의
- `sidebar.tsx`가 content 파일을 읽어 동적 렌더링 (빌드타임 import)
- content 파일 없으면 기존 하드코딩 fallback (Sprint 131 패턴)

### 랜딩 페이지 섹션
- TinaCMS `landing` collection에 `sort_order` 필드 추가
- 섹션 content 파일 추가 (features, stats, cta 등)
- 랜딩 페이지가 sort_order 기준으로 섹션 렌더링

## §3 구현 순서

| 단계 | 파일 | 작업 |
|:----:|------|------|
| 1 | `tina/config.ts` | navigation collection 추가 + landing에 sort_order |
| 2 | `content/navigation/sidebar.json` | 초기 메뉴 구조 데이터 |
| 3 | `content/landing/*.md` | 섹션별 content 파일 (features, stats, cta) |
| 4 | `src/lib/navigation-loader.ts` | content 파일 로더 + fallback |
| 5 | `src/components/sidebar.tsx` | 동적 메뉴 렌더링 연결 |
| 6 | `src/routes/landing.tsx` | 동적 섹션 순서 렌더링 |
| 7 | 전체 검증 | typecheck + build + E2E |

## §4 리스크

| 리스크 | 완화 |
|--------|------|
| TinaCMS JSON collection 지원 | PoC에서 MD만 테스트됨 → JSON 미지원 시 MD+frontmatter로 전환 |
| 사이드바 아이콘 매핑 | icon은 코드에서만 사용 가능 → content에는 icon key만 저장, 코드에서 매핑 |
| 빌드타임 vs 런타임 | Vite `?raw` import로 빌드타임 포함, TinaCMS 편집은 PR 후 재배포 |
