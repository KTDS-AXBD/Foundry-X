---
code: FX-PLAN-S141
title: "Sprint 141 — F323 대시보드 ToDo + F324 발굴 탭 통합"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-05
updated: 2026-04-05
author: Claude Opus 4.6
sprint: 141
f_items: [F323, F324]
---

# FX-PLAN-S141 — 대시보드 ToDo List + 발굴 탭 통합

## Executive Summary

| 항목 | 값 |
|------|-----|
| Feature | F323 대시보드 ToDo + F324 발굴 탭 통합 |
| Sprint | 141 |
| 우선순위 | P1 (둘 다) |
| 예상 소요 | ~10h (F323 ~5h + F324 ~5h) |
| 변경 패키지 | web (routes + components) |
| 선행 | F322 ✅ (Sprint 139, 사이드바 구조) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **Problem** | 대시보드에 현재 단계/다음 할 일이 없어 사용자가 어디서 시작할지 모름. 발굴 메뉴가 4개 분산 |
| **Solution** | 대시보드에 아이템별 ToDo + 업무 가이드 추가. 발굴을 3탭(대시보드/프로세스/BMC)으로 통합 |
| **Function UX Effect** | 대시보드 진입 시 즉시 다음 액션 파악. 발굴 메뉴 4→2로 축소 |
| **Core Value** | "지금 뭘 해야 하지?" 질문에 대시보드가 답하는 구조 |

## §1 F323: 대시보드 ToDo List + 업무 가이드

### 목표
기존 dashboard.tsx에 ToDo List + 업무 가이드 섹션을 추가. v1.3 §5.1/§5.2 기준.

### ToDo List 영역
- 아이템별 6단계 중 현재 위치 시각화 (Stage Indicator)
- 다음 할 일 체크리스트 (API에서 조회 또는 로컬 계산)
- 의사결정 대기 알림 (Go/Hold/Drop 투표 필요 시)
- ToDo 클릭 시 해당 메뉴로 이동

### 업무 가이드 영역
- 4단계 검증 흐름 안내 (본부→전사→Pre-PRB→임원)
- 5단계 제품화 병렬 진행 안내
- 개발 파이프라인 안내 (PRD→req-interview→PDCA→배포)
- 접기/펼치기 가능한 카드 UI

### 구현 방식
- `dashboard.tsx` 하단에 `<TodoSection />` + `<WorkGuideSection />` 컴포넌트 추가
- API: `/biz-items/summary` 엔드포인트 활용 (기존) + 클라이언트 사이드 단계 계산
- 업무 가이드는 정적 콘텐츠 (API 호출 없음)

## §2 F324: 발굴 탭 통합

### 목표
/discovery 메인 페이지에 3탭(대시보드/프로세스/BMC) 통합. v1.3 §3.3 기준.

### 탭 구성
1. **대시보드** (기본 랜딩) — 기존 discover-dashboard.tsx 콘텐츠
2. **프로세스** — 기존 discovery.tsx + 멀티 페르소나 평가 통합
3. **BMC** — 기존 ideas-bmc.tsx 콘텐츠

### 구현 방식
- `/discovery` 라우트를 탭 래퍼 컴포넌트로 교체
- 기존 페이지 컴포넌트를 각 탭 콘텐츠로 임포트
- URL: `/discovery?tab=dashboard|process|bmc` (searchParams 기반)
- 스킬카탈로그→위키: 사이드바 메뉴에서 제거 (F322에서 완료), 위키 페이지 내 링크 추가

## §3 구현 순서

| 단계 | F# | 파일 | 작업 |
|:----:|:--:|------|------|
| 1 | F323 | `src/components/feature/TodoSection.tsx` | 신규 — ToDo 카드 + Stage Indicator |
| 2 | F323 | `src/components/feature/WorkGuideSection.tsx` | 신규 — 업무 가이드 4개 카드 |
| 3 | F323 | `src/routes/dashboard.tsx` | 수정 — TodoSection + WorkGuideSection 통합 |
| 4 | F324 | `src/routes/discovery-unified.tsx` | 신규 — 3탭 래퍼 (Tabs UI) |
| 5 | F324 | `src/router.tsx` | 수정 — /discovery → discovery-unified |
| 6 | 공통 | 전체 검증 | typecheck + build + E2E |

## §4 리스크

| 리스크 | 완화 |
|--------|------|
| dashboard.tsx 314L에 추가 시 파일 비대 | TodoSection/WorkGuideSection을 별도 컴포넌트로 분리 |
| 발굴 탭 전환 시 기존 URL 호환 | searchParams 기반 + 기존 /discovery/items 등은 리다이렉트 유지 (F322) |
| 멀티 페르소나 통합 범위 | 프로세스 탭 내에서 기존 discovery.tsx를 그대로 렌더 (래핑만) |
