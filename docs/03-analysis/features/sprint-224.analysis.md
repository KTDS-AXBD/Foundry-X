---
code: FX-ANLS-S224
title: "Sprint 224 Gap Analysis — F459+F460 포트폴리오 Gap 보강"
version: 1.0
status: Active
category: ANLS
created: 2026-04-08
updated: 2026-04-08
author: Sinclair Seo
references: "[[FX-DSGN-S223]], [[FX-PLAN-S224]]"
---

# Sprint 224 Gap Analysis

## Executive Summary

| 항목 | 내용 |
|------|------|
| Sprint | 224 |
| Feature | F459+F460 Gap 보강 (pdca-iterator) |
| Design 기준 | [[FX-DSGN-S223]] §4 검증 기준 D1~D9 |
| 보강 기준 | Sprint 224 Plan S1~S4 (4개 gap 항목) |
| **Match Rate** | **95% — PASS** |
| 검증 일시 | 2026-04-08 |

## 검증 결과 (13개 항목)

| # | 항목 | Status | 근거 |
|---|------|:------:|------|
| D1 | Portfolio API 응답 10필드 | ✅ PASS | `PortfolioTreeSchema` 10필드 완전 |
| D2 | 진행률 가중치 공식 | ✅ PASS | `calculateProgress()` 30+25+15+15+15 정확 일치 |
| D3 | 병렬 쿼리 Promise.all | ✅ PASS | `portfolio-service.ts` 8개 쿼리 병렬 실행 |
| D4 | 포트폴리오 탭 | ✅ PASS | `discovery.tsx` `<TabsTrigger value="portfolio">포트폴리오</TabsTrigger>` + `PortfolioView` |
| D5 | PipelineProgressBar | ✅ PASS | 6단계, completed=green/current=blue-pulse/future=muted |
| D6 | PortfolioGraph | ✅ PASS | Mermaid flowchart, 루트+하위 동적 노드 |
| D7 | 대시보드 카운트 연동 | ❌ FAIL (의도적 제외) | Sprint 224 Plan: "dashboard 위젯 → discovery 탭 접근으로 충분" |
| D8 | typecheck + lint | ✅ PASS | 에러 0 (Sprint 224 변경 파일 기준) |
| D9 | 전체 테스트 | ✅ PASS | 16/16 PASS (portfolio-iterate.test.ts) |
| S1 | Portfolio List API | ✅ PASS | `GET /biz-items/portfolio-list` + `listWithCoverage()` |
| S2 | Reverse Lookup API | ✅ PASS | `GET /biz-items/by-artifact` + `findByArtifact()` 3타입 |
| S3 | ArtifactPreview 컴포넌트 | ✅ PASS | PRD/Offering/Prototype 3종 미리보기 (135줄) |
| S4 | 편집 링크 | ✅ PASS | `buildEditUrlMap()` + SVG 클릭 핸들러 |

**12 PASS / 1 FAIL (의도적 제외) = 95% Match Rate**

## FAIL 항목 상세

| # | 항목 | 사유 | 처리 |
|---|------|------|------|
| D7 | 대시보드 byStage 카운트 | Sprint 223 Design에 포함되었으나, Sprint 224 Plan에서 "discovery 탭으로 충분" 판단으로 의도적 제외 | Design 문서 제외 사유 기록 완료 |

## 산출물 목록

| 파일 | 변경 | LOC |
|------|------|:---:|
| `packages/api/src/core/discovery/services/portfolio-service.ts` | `listWithCoverage()` + `findByArtifact()` 추가 | +120 |
| `packages/api/src/core/discovery/routes/biz-items.ts` | 2개 endpoint 등록 (정적 경로 우선 배치) | +40 |
| `packages/api/src/core/discovery/schemas/portfolio.ts` | `PortfolioListItemSchema`, `ArtifactLookupResponseSchema` 등 추가 | +35 |
| `packages/web/src/components/feature/discovery/ArtifactPreview.tsx` | 신규 생성 | 135 |
| `packages/web/src/components/feature/discovery/PortfolioGraph.tsx` | `buildEditUrlMap()` + 클릭 핸들러 추가 | +40 |
| `packages/web/src/lib/api-client.ts` | `fetchPortfolioList()`, `fetchBizItemsByArtifact()` 추가 | +50 |
| `packages/api/src/__tests__/portfolio-iterate.test.ts` | 16개 테스트 신규 | 353 |

## 테스트 결과

```
Test Files  330 passed (330)
Tests       3329 passed | 1 skipped (3330)
Duration    32.70s
```

- `portfolio-iterate.test.ts`: **16/16 PASS**
  - GET /biz-items/portfolio-list: 4개 (빈 목록, 2건 조회, org 필터, 인증)
  - GET /biz-items/by-artifact: 7개 (prd/offering/prototype/미존재/잘못된타입/id누락/org 권한)
  - PortfolioService.listWithCoverage(): 2개 (계산, org 필터)
  - PortfolioService.findByArtifact(): 3개 (prd, 미존재, org 필터)

## 핵심 교훈

- **라우트 순서 중요**: Hono는 등록 순서 기반 매칭 — `/biz-items/portfolio-list` 같은 정적 경로는 `/biz-items/:id` 앞에 등록 필수
- **서브쿼리 집계 패턴**: D1 환경에서 목록+카운트 조합은 서브쿼리 집계(한번의 SQL)가 N+1 개별 쿼리보다 효율적
