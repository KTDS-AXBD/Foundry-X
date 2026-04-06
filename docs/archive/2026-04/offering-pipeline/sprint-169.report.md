---
code: FX-RPRT-S169
title: "Sprint 169 완료 보고서 — Offerings 목록 + 생성 위자드"
version: 1.0
status: Active
category: RPRT
created: 2026-04-06
updated: 2026-04-06
author: Sinclair Seo
references: "[[FX-PLAN-S169]], [[FX-DSGN-S169]], [[FX-ANLS-S169]]"
---

# Sprint 169 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F374 (Offerings 목록 페이지) + F375 (Offering 생성 위자드) |
| Sprint | 169 |
| Phase | 18-C (Full UI) |
| 기간 | 2026-04-06 (단일 세션) |
| Match Rate | **100% (27/27 PASS)** |

### Results

| 지표 | 값 |
|------|------|
| Match Rate | 100% (27/27) |
| 신규 파일 | 2개 (offerings-list.tsx, offering-create-wizard.tsx) |
| 수정 파일 | 3개 (api-client.ts, router.tsx, sidebar.tsx) |
| 테스트 | 329 passed (48 files), 0 fail |
| typecheck | PASS |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Offerings CRUD API는 있으나 Web UI가 없어 사업기획서 시각적 관리 불가 |
| Solution | Offerings 목록(상태 필터 + 카드 그리드) + 3단계 생성 위자드(발굴 연결 + 정보 + 목차) |
| Function UX Effect | 사업기획서 전체 현황 한눈에 파악 + 위자드로 일관된 생성 경험 |
| Core Value | 형상화 파이프라인 사용자 진입점 확보, 발굴→형상화 연결고리 완성 |

## 구현 내역

### F374: Offerings 목록 페이지
- `/shaping/offerings` 라우트 — 카드 그리드 뷰
- 상태 필터 탭 6개 (all/draft/generating/review/approved/shared)
- 카드: 상태 배지 + 목적 태그 + 포맷 아이콘 + 버전 배지 + 생성일
- 빈 상태 + 스켈레톤 로딩 + 삭제(confirm + DELETE API)
- 사이드바 "Offerings" 메뉴 추가

### F375: Offering 생성 위자드
- `/shaping/offerings/new` — 프로젝트 최초 멀티스텝 위자드
- Step 1: 발굴 아이템 검색/선택 + 건너뛰기
- Step 2: 제목(필수) + 목적(3종) + 포맷(2종) + 자동 프리필
- Step 3: 22개 표준 섹션 체크리스트 (필수 고정 + 선택 토글)
- 생성 후 선택 해제 섹션 자동 toggle-off → 에디터 이동

### API Client 확장
- `fetchOfferings()` — 목록 조회 (상태 필터 + 페이지네이션)
- `createOffering()` — 생성
- `deleteOffering()` — 삭제
- `toggleOfferingSection()` — 섹션 토글

## 특이사항

- **프로젝트 첫 멀티스텝 위자드**: useState 단일 객체로 상태 관리, 별도 라이브러리 불필요
- **excludedSections 역방향 패턴**: Design의 selectedSections → 구현은 excludedSections(Set). "기본 전체 선택" 의미가 빈 Set으로 더 명확
- **API 수정 없음**: 기존 F370 CRUD + F371 Sections API를 100% 재활용
