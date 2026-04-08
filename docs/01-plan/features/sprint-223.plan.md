---
code: FX-PLAN-S223
title: "Sprint 223 — 포트폴리오 검색 + 대시보드"
version: 1.0
status: Draft
category: PLAN
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
references: "[[FX-SPEC-001]]"
---

# Sprint 223: 포트폴리오 연결 구조 검색 + 포트폴리오 대시보드

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F459 포트폴리오 연결 구조 검색 + F460 포트폴리오 대시보드 |
| Sprint | 223 |
| Phase | Phase 26 (BD Portfolio Management) |
| 우선순위 | P1 |
| 의존성 | Sprint 222 (F457~F458 Prototype Builder + 등록) 선행 |
| PRD | Phase 26 BD Portfolio Management |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 사업 아이템별로 발굴→평가→기획서→Offering→Prototype까지 이어지는 전체 연결 구조를 한눈에 볼 수 없어, 어느 단계까지 진행됐는지 파악이 어렵고 문서 간 추적이 수동 |
| Solution | 전체 파이프라인 연결 구조를 트리 JSON으로 반환하는 API + Discovery 페이지에 포트폴리오 뷰 추가 (파이프라인 진행률 시각화 + 문서 연결 그래프) |
| Function UX Effect | 사업 아이템 선택 → 전체 이력 즉시 조회 / 대시보드에서 전체 포트폴리오 현황 파악 → 의사결정 속도 향상 |
| Core Value | BD 라이프사이클 가시성 확보 — "어디까지 왔고, 무엇이 남았는지" 한 화면에서 파악 |

## 범위

### F459: 포트폴리오 연결 구조 검색 (FX-REQ-451)

| # | 컴포넌트/파일 | 작업 |
|---|------------|------|
| 1 | `core/discovery/services/portfolio-service.ts` | 포트폴리오 트리 조립 서비스 (다중 테이블 조회 + 트리 구성) |
| 2 | `core/discovery/schemas/portfolio.ts` | Zod 응답 스키마 (PortfolioTree) |
| 3 | `core/discovery/routes/biz-items.ts` | `GET /biz-items/:id/portfolio` 엔드포인트 추가 |
| 4 | `__tests__/portfolio-service.test.ts` | 서비스 단위 테스트 |
| 5 | `__tests__/portfolio-route.test.ts` | 라우트 통합 테스트 |

### F460: 포트폴리오 대시보드 (FX-REQ-452)

| # | 컴포넌트/파일 | 작업 |
|---|------------|------|
| 1 | `components/feature/discovery/PortfolioView.tsx` | 포트폴리오 뷰 메인 컴포넌트 (목록 + 진행률) |
| 2 | `components/feature/discovery/PipelineProgressBar.tsx` | 아이템별 파이프라인 6단계 진행률 바 |
| 3 | `components/feature/discovery/PortfolioGraph.tsx` | 문서 연결 시각화 (Mermaid flowchart 또는 커스텀 SVG) |
| 4 | `routes/ax-bd/discovery.tsx` | 포트폴리오 탭 추가 (기존 목록 탭 옆) |
| 5 | `lib/api-client.ts` | `fetchPortfolio(bizItemId)` 함수 추가 |
| 6 | `routes/dashboard.tsx` | 파이프라인 카운트 실제 데이터 연동 (현재 0 하드코딩 해소) |
| 7 | `__tests__/portfolio-view.test.tsx` | 컴포넌트 단위 테스트 |

## 주요 파일 목록

### 신규 생성
```
packages/api/src/
  core/discovery/services/portfolio-service.ts     # F459
  core/discovery/schemas/portfolio.ts              # F459
  __tests__/portfolio-service.test.ts              # F459
  __tests__/portfolio-route.test.ts                # F459

packages/web/src/
  components/feature/discovery/
    PortfolioView.tsx                              # F460
    PipelineProgressBar.tsx                        # F460
    PortfolioGraph.tsx                             # F460
  __tests__/portfolio-view.test.tsx                # F460
```

### 수정 대상
```
packages/api/src/
  core/discovery/routes/biz-items.ts               # F459 라우트 추가

packages/web/src/
  routes/ax-bd/discovery.tsx                       # F460 포트폴리오 탭 추가
  routes/dashboard.tsx                             # F460 파이프라인 카운트 연동
  lib/api-client.ts                                # F460 API 함수 추가
```

## 작업 순서

```
F459 (API) ──────────────────────────────────┐
  1. portfolio.ts 스키마 정의                    │
  2. portfolio-service.ts 서비스 구현            │
  3. biz-items.ts 라우트 추가                    │
  4. 테스트 작성 (서비스 + 라우트)                │
                                               ▼
F460 (Web) ───────────────────────────────────
  5. api-client.ts 함수 추가
  6. PipelineProgressBar.tsx 구현
  7. PortfolioGraph.tsx 구현
  8. PortfolioView.tsx 통합 컴포넌트
  9. discovery.tsx 탭 추가
 10. dashboard.tsx 파이프라인 카운트 연동
 11. 테스트 작성
```

## 성공 기준

| # | 기준 | 검증 방법 |
|---|------|----------|
| 1 | `GET /biz-items/:id/portfolio` 가 전체 연결 트리를 정확히 반환 | API 테스트: biz_item 1건에 classification + evaluation + starting_point + criteria + business_plan + offering + prototype 각각 1건 이상 연결된 fixture로 검증 |
| 2 | 연결된 자식 문서가 없는 경우 빈 배열 반환 (에러 아님) | API 테스트: biz_item만 있고 하위 데이터 없는 케이스 |
| 3 | Discovery 목록에 포트폴리오 탭 전환 가능 | 수동: `/ax-bd/discovery` 접근 → 탭 클릭 |
| 4 | 포트폴리오 뷰에서 각 아이템별 6단계 진행률 표시 | 수동: 데모 데이터 기준으로 REGISTERED~OFFERING 진행 바 렌더링 확인 |
| 5 | 문서 연결 그래프가 아이템→하위 문서 관계를 시각화 | 수동: 아이템 선택 시 트리/그래프 노드 렌더링 확인 |
| 6 | 대시보드 파이프라인 카운트가 실제 DB 수치 반영 | 수동: `/dashboard` 접근 → 파이프라인 스테이지별 숫자 > 0 |
| 7 | typecheck + lint + test 통과 | `turbo typecheck lint test` 0 에러 |

## 리스크

| # | 리스크 | 완화 방안 |
|---|--------|----------|
| 1 | 다중 JOIN 쿼리 성능 (7개 테이블) | 서비스 레이어에서 개별 쿼리 조립 방식 채택 (D1은 복잡 JOIN보다 단순 쿼리 다회 실행이 안정적) |
| 2 | 문서 연결 그래프 렌더링 복잡도 | 초기에는 Mermaid 기반으로 빠르게 구현, 추후 커스텀 SVG로 진화 |
| 3 | 대시보드 파이프라인 카운트와 기존 로직 충돌 | 기존 STAGES 상수 활용 + summary API 재사용 |
