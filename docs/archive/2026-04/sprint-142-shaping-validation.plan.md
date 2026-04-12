---
code: FX-PLAN-S142
title: "Sprint 142 — F325 형상화 재구성 + F326 검증 탭 통합"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 142
f_items: [F325, F326]
---

# FX-PLAN-S142 — 형상화 재구성 + 검증 탭 통합

## Executive Summary

| 항목 | 값 |
|------|-----|
| Feature | F325 형상화 버전관리 + F326 검증 탭 통합 |
| Sprint | 142 |
| 우선순위 | P2 (둘 다) |
| 예상 소요 | ~8h (F325 ~4h + F326 ~4h) |
| 변경 패키지 | web (routes + components) |
| 선행 | F322 ✅ (사이드바 구조), F324 ✅ (탭 패턴 참조) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | 형상화 5메뉴 중 역할 혼재(PRD vs 사업제안서 vs 리뷰). 검증 4메뉴 분산으로 단계간 연결 약함 |
| **Solution** | 형상화 4메뉴(사업기획서/Offering/PRD/Prototype) + 버전관리 UI. 검증 4탭 통합 + 산출물 공유 |
| **Function UX Effect** | 형상화 메뉴 5→4 정리. 검증 메뉴 4→2 축소. 각 산출물에 버전 히스토리 표시 |
| **Core Value** | 산출물 생성~공유까지 연속적 워크플로우 |

## §1 F325: 형상화 재구성 + 버전관리 패턴

### 메뉴 변경 (F322에서 이미 사이드바 반영 완료)
- 사업기획서 → /shaping/business-plan (기존 사업제안서 리네임)
- Offering → /shaping/offering (형상화에서 유지, 5단계 Offering Pack과 별개)
- PRD → /shaping/prd (유지)
- Prototype → /shaping/prototype (유지)

### 버전관리 패턴
모든 산출물 페이지에 공통 버전관리 UI:
- 버전 목록 드롭다운 (v1, v2, ...)
- 현재 버전 편집
- 버전간 비교 (diff view) — 후속 확장, 이번엔 목록만

### 구현 방식
- `VersionBadge` 공통 컴포넌트 신규 — 버전 선택 드롭다운 + "새 버전" 버튼
- 기존 페이지(ax-bd/index, offering-packs, spec-generator, shaping-prototype)에 VersionBadge 통합
- 형상화 리뷰(/shaping/review) → 대시보드 ToDo로 이동 (F322 리다이렉트 완료)

## §2 F326: 검증 탭 통합 + 산출물 공유

### 탭 구성 (F324 discovery-unified.tsx 패턴 참조)
1. **인터뷰/미팅** (기본 랜딩) — 기존 validation-meetings.tsx
2. **본부 검증** — 기존 validation-division.tsx
3. **전사 검증** — 기존 validation-company.tsx
4. **임원 검증** — 신규 (기본 placeholder)

### 산출물 공유
- /validation/share — 기존 team-shared.tsx 재활용 (F322에서 리다이렉트 완료)

### 구현 방식
- `validation-unified.tsx` 신규 — 4탭 래퍼 (F324 패턴 동일)
- router.tsx /validation → validation-unified
- URL: /validation?tab=meetings|division|company|executive

## §3 구현 순서

| 단계 | F# | 파일 | 작업 |
|:----:|:--:|------|------|
| 1 | F325 | `src/components/feature/VersionBadge.tsx` | 신규 — 버전 드롭다운 + 새 버전 버튼 |
| 2 | F325 | 형상화 4개 라우트 | 수정 — VersionBadge 통합 |
| 3 | F326 | `src/routes/validation-unified.tsx` | 신규 — 4탭 래퍼 |
| 4 | F326 | `src/router.tsx` | 수정 — /validation → validation-unified |
| 5 | 공통 | typecheck + build | 검증 |

## §4 리스크

| 리스크 | 완화 |
|--------|------|
| 버전관리 API 미존재 | 프론트엔드 UI만 구현, 버전 데이터는 mock/로컬 상태 |
| 임원 검증 페이지 없음 | placeholder "준비 중" 표시 |
