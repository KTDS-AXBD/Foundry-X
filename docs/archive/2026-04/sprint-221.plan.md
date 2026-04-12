---
code: FX-PLAN-S221
title: "Sprint 221 — 최종 PRD 확정 + 버전 관리"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
references: "[[FX-SPEC-001]]"
---

# Sprint 221: 최종 PRD 확정 + 버전 관리

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F456 — 최종 PRD 확정 + 3단계 버전 관리 |
| Sprint | 221 |
| 우선순위 | P0 |
| 의존성 | Sprint 220 (F455 2차 PRD 보강) 완료 |
| Phase | 26-B: PRD 생성 파이프라인 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 2차 PRD까지 생성되지만, 최종 확정 프로세스와 버전 비교 수단이 없어 PRD 품질 보증 불가 |
| Solution | PDCA 기반 검증 → 확정 전환 + 3단계 PRD 버전 비교/편집 UI + 히스토리 API |
| Function UX Effect | PRD 생성~확정 전체 라이프사이클을 UI에서 추적 가능 |
| Core Value | PRD 품질 게이트 확보 → Prototype Builder(F457) 입력 신뢰도 보장 |

---

## 작업 목록

### 1. PRD 확정 파이프라인 (백엔드)

| # | 작업 | 설명 |
|---|------|------|
| 1-1 | PRD 확정 API | `POST /biz-items/:id/prds/:prdId/confirm` — 2차 PRD를 PDCA 검증 후 version 3(confirmed)으로 복제 |
| 1-2 | PRD 확정 서비스 | `PrdConfirmationService` — 2차 PRD 내용 검증 + status 전환 + version 3 INSERT |
| 1-3 | PRD 상태 컬럼 추가 | `biz_generated_prds`에 `status TEXT DEFAULT 'draft'` 컬럼 — draft/reviewing/confirmed |
| 1-4 | PDCA 검증 로직 | Plan/Design 섹션 존재 여부 + 필수 항목(목표/범위/제약/성공지표) 체크 |

### 2. PRD 버전 히스토리 API

| # | 작업 | 설명 |
|---|------|------|
| 2-1 | 버전 목록 API | `GET /biz-items/:id/prds` — 해당 아이템의 전체 PRD 버전 목록 (version, status, generated_at) |
| 2-2 | 버전 상세 API | `GET /biz-items/:id/prds/:prdId` — 특정 버전 PRD 전문 조회 |
| 2-3 | 버전 비교 API | `GET /biz-items/:id/prds/diff?v1={id1}&v2={id2}` — 두 버전 간 diff 반환 (line-level) |
| 2-4 | PRD 편집 API | `PATCH /biz-items/:id/prds/:prdId` — 2차/3차 PRD 내용 수정 (1차는 읽기 전용) |

### 3. PRD 관리 UI

| # | 작업 | 설명 |
|---|------|------|
| 3-1 | PRD 목록 뷰 | 사업 아이템 상세 내 PRD 탭 — 3단계 버전 카드 (1차/2차/3차) + 상태 뱃지 |
| 3-2 | PRD 상세 뷰 | Markdown 렌더링 + 메타데이터 (생성일/모델/토큰) + 버전 비교 토글 |
| 3-3 | PRD 편집기 | 2차/3차 PRD 대상 인라인 Markdown 에디터 (1차는 읽기 전용 표시) |
| 3-4 | Diff 비교 뷰 | Side-by-side 또는 unified diff — 버전 선택 드롭다운 2개 |
| 3-5 | 확정 버튼 | 2차 PRD 상세에서 "확정하기" CTA → 확인 다이얼로그 → confirm API 호출 |

### 4. 테스트

| # | 작업 | 설명 |
|---|------|------|
| 4-1 | API 단위 테스트 | confirm/diff/edit 엔드포인트 — Hono app.request() 방식 |
| 4-2 | 서비스 단위 테스트 | PrdConfirmationService — 상태 전환 + 검증 로직 |
| 4-3 | UI 컴포넌트 테스트 | PrdVersionCard, PrdDiffView — Vitest + React Testing |

---

## 사전 조건

- [ ] Sprint 220 (F455 2차 PRD 보강) merge 완료
- [ ] `biz_generated_prds` 테이블에 version 1~2 데이터 존재 (F454/F455 산출물)
- [ ] D1 마이그레이션 번호 확인 (`ls migrations/*.sql | sort | tail -1`)

## 성공 기준 (MVP)

- [ ] PRD 확정 API: 2차 PRD → confirmed 상태 전환 + version 3 생성
- [ ] 버전 히스토리: 아이템당 1차/2차/3차 PRD 목록 조회
- [ ] 버전 비교: 임의의 두 버전 간 line-level diff 반환
- [ ] PRD 편집: 2차/3차 수정 가능, 1차는 읽기 전용 강제
- [ ] UI: PRD 목록 → 상세(버전 비교) → 편집기 전체 흐름 동작
- [ ] 테스트: API 3건 + 서비스 2건 + UI 2건 통과
