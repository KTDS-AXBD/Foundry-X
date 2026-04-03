---
code: FX-RPRT-S123
title: "Sprint 123 — F301 BD 산출물 UX 연결성 개선 완료 보고서"
version: "1.0"
status: Active
category: RPRT
created: 2026-04-03
updated: 2026-04-03
author: Claude Opus 4.6
sprint: 123
f_items: [F301]
---

# FX-RPRT-S123 — Sprint 123 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F301 BD 산출물 UX 연결성 개선 |
| Sprint | 123 |
| REQ | FX-REQ-293 (P2) |
| 기간 | 2026-04-03 (단일 세션) |
| Match Rate | **100%** (10/10 PASS) |
| 변경 파일 | 4건 (3 routes + 1 test) |
| 신규 파일 | 0건 |
| 테스트 | 314/314 통과 |

### Results

| 지표 | 값 |
|------|-----|
| Match Rate | 100% (10/10) |
| 변경 파일 수 | 4 |
| 추가 LOC | ~65 |
| 삭제 LOC | ~6 |
| 신규 컴포넌트 | 0 (기존 재사용) |
| 테스트 통과율 | 314/314 (100%) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | BD 산출물이 화면 간 단절 — discovery-detail에서 산출물 미표시, pipeline에서 full reload, MVP에서 원본 미링크 |
| Solution | 3-Phase UX 연결: 산출물 섹션 삽입 + SPA 네비게이션 + 역링크 |
| Function UX Effect | 발굴 상세에서 산출물+진행률 즉시 확인, 파이프라인 카드 SPA 탐색, MVP→원본 1-click |
| Core Value | BD 업무 동선 단축 — 3개 주요 화면 간 자연스러운 탐색 동선 확보 |

## 상세 구현

### Phase 1: discovery-detail 산출물 섹션
- `getDiscoveryProgress()` API 병렬 호출 추가
- 7단계 프로세스 진행률 바 (완료=초록, 현재=파랑+링, 미진행=회색)
- `<ArtifactList bizItemId={id} />` 기존 컴포넌트 재사용
- `STAGE_LABELS` / `STAGE_COLORS` item-card.tsx에서 import

### Phase 2: Pipeline 드릴다운
- `window.location.href` → `useNavigate()` 전환 (SPA 네비게이션)
- 상태 보존 + 빠른 탐색

### Phase 3: MVP 역링크
- `import { Link } from "react-router-dom"` 추가
- bizItemId 컬럼: 클릭 가능한 Link (8자 축약 표시)
- bizItemId 없는 경우 "-" 유지

### 테스트 보정
- `mvp-tracking.test.tsx`: `<MemoryRouter>` 래핑 추가 (Link 컴포넌트 Router 컨텍스트 필요)

## PDCA 문서

| 문서 | 코드 |
|------|------|
| Plan | FX-PLAN-S123 |
| Design | FX-DSGN-S123 |
| Analysis | FX-ANLS-S123 (100%) |
| Report | FX-RPRT-S123 (본 문서) |
