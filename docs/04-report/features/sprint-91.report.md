---
code: FX-RPRT-S91
title: "Sprint 91 완료 보고서 — BD 프로세스 진행 추적 + 사업성 신호등"
version: 1.0
status: Active
category: RPRT
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-PLAN-S91]], [[FX-DSGN-S91]], [[FX-SPEC-001]]"
---

# Sprint 91 완료 보고서

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F262 BD 프로세스 진행 추적 + 사업성 신호등 |
| Sprint | 91 |
| 기간 | 2026-03-31 |
| Match Rate | **100%** (Design 12/12 파일 매핑 완전 일치) |

### Results Summary

| 지표 | 수치 |
|------|------|
| Match Rate | 100% |
| 신규 파일 | 10개 |
| 수정 파일 | 3개 (app.ts, api-client.ts, sidebar.tsx + router.tsx) |
| API 테스트 | 18개 (서비스 13 + 라우트 5) |
| Web 테스트 | 13개 (컴포넌트) |
| 총 테스트 | 31개 |
| 새 엔드포인트 | 3개 |
| 새 마이그레이션 | 0개 (기존 테이블 Aggregation) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | BD 프로세스의 핵심 데이터(진행 단계, 사업성 신호등, Commit Gate, 산출물)가 5개 API에 분산 |
| Solution | BdProcessTracker Aggregation Layer — 5회 배치 SQL로 통합 뷰 생성, 새 DB 테이블 불필요 |
| Function UX Effect | 포트폴리오 대시보드에서 신호등·병목·완료율 즉시 확인, 신호등 필터로 위험 아이템 탐지 |
| Core Value | BD 프로세스가 "실행 → 추적 → 의사결정"의 폐루프 완성 |

## 구현 상세

### API (packages/api)

| 파일 | 유형 | 내용 |
|------|------|------|
| `services/bd-process-tracker.ts` | 신규 | 통합 진행 추적 서비스 (3 메서드, 배치 SQL 5회) |
| `routes/ax-bd-progress.ts` | 신규 | 3 엔드포인트 (item, portfolio, summary) |
| `schemas/bd-progress.schema.ts` | 신규 | progressQuerySchema (signal, pipelineStage, page, limit) |
| `app.ts` | 수정 | import + route 등록 |

### Web (packages/web)

| 파일 | 유형 | 내용 |
|------|------|------|
| `routes/ax-bd/progress.tsx` | 신규 | Progress Tracker 페이지 (필터 + 목록) |
| `components/feature/ProcessProgressCard.tsx` | 신규 | 아이템별 진행 카드 (11단계 바 + 신호등) |
| `components/feature/PortfolioSummary.tsx` | 신규 | 포트폴리오 요약 위젯 (집계 + 병목) |
| `lib/api-client.ts` | 수정 | 7개 타입 + 3개 API 함수 추가 |
| `components/sidebar.tsx` | 수정 | "진행 추적" 메뉴 추가 |
| `router.tsx` | 수정 | ax-bd/progress 라우트 추가 |

### 테스트

| 테스트 파일 | 테스트 수 | 결과 |
|------------|----------|------|
| bd-process-tracker.test.ts | 13 | ✅ PASS |
| bd-progress-route.test.ts | 5 | ✅ PASS |
| process-progress.test.tsx | 13 | ✅ PASS |

### 핵심 기술 결정

1. **Aggregation Layer 패턴**: 새 DB 테이블 없이 기존 5개 테이블을 5회 배치 쿼리로 조립
2. **Discovery Stage 추적**: `bd_artifacts.stage_id`의 `completed` 산출물 존재 여부로 판단
3. **포트폴리오 신호등 필터**: 서버 사이드 필터링 (summary는 필터 전 전체 기준, items는 필터 후)
4. **병목 탐지**: `currentDiscoveryStage` 기준 가장 많은 아이템이 정체한 단계 자동 탐지

## 리스크

- 없음 (새 마이그레이션 불필요, 기존 인프라만 활용)
