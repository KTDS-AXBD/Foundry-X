---
code: FX-ANLS-S172
title: "Sprint 172 Gap Analysis — offering-pptx 구현 (F380)"
version: 1.0
status: Active
category: ANLS
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
references: "[[FX-DSGN-S172]], [[FX-PLAN-S172]]"
---

# Sprint 172 Gap Analysis: F380 offering-pptx 구현

## Executive Summary

| 항목 | 결과 |
|------|------|
| Match Rate | **97%** (33/34 항목 PASS) |
| 변경 파일 | 7개 (수정 4 + 신규 3) |
| 테스트 | 12 pass / 0 fail |
| 판정 | ✅ PASS (≥90%) |

## 상세 항목별 분석

### §2. Schema 확장

| # | Design 항목 | 구현 | 결과 |
|---|------------|------|------|
| 2.1 | ExportFormatSchema: ["html"] → ["html", "pptx"] | `z.enum(["html", "pptx"])` | ✅ PASS |

### §3. 슬라이드 타입 시스템 (pptx-slide-types.ts)

| # | Design 항목 | 구현 | 결과 |
|---|------------|------|------|
| 3.1 | SlideType 15종 타입 정의 | 15종 union type 정확 일치 | ✅ PASS |
| 3.2 | SlideMapping interface (sectionKey, slideType, slideCount, isRequired) | 4필드 interface 일치 | ✅ PASS |
| 3.3 | SECTION_SLIDE_MAP 22항목 | 22항목 정확 일치 | ✅ PASS |
| 3.4 | getSlideMapping 헬퍼 | 구현 완료 (Design에 명시 없지만 추가 유틸) | ✅ PASS |
| 3.5 | calculateTotalSlides 헬퍼 | 구현 완료 | ✅ PASS |

### §4. PPTX 렌더러 (pptx-renderer.ts)

| # | Design 항목 | 구현 | 결과 |
|---|------------|------|------|
| 4.1 | PptxRenderInput interface | offering/sections/tokens 3필드 | ✅ PASS |
| 4.2 | renderPptx → Promise<Uint8Array> | 시그니처 일치 | ✅ PASS |
| 4.3-1 | PptxGenJS LAYOUT_WIDE + Pretendard | `pres.layout = "LAYOUT_WIDE"`, fontFamily: Pretendard | ✅ PASS |
| 4.3-2 | 표지 슬라이드 (title + purpose + date) | addTitleSlide 구현 | ✅ PASS |
| 4.3-3 | 목차 슬라이드 (2열 번호 목록) | addTocSlide 구현 | ✅ PASS |
| 4.3-4 | 섹션별 SECTION_SLIDE_MAP 순회 | for-of loop 일치 | ✅ PASS |
| 4.3-5 | slideCount > 1 콘텐츠 분할 | chunkSize 기반 분할 구현 | ✅ PASS |
| 4.3-6 | 마무리 슬라이드 | addClosingSlide 구현 | ✅ PASS |
| 4.3-7 | pres.write({ outputType: "uint8array" }) | 일치 | ✅ PASS |
| 4.4-1 | hero-slide 레이아웃 (한줄 요약 + KPI 3개) | renderHeroSlide 구현 | ✅ PASS |
| 4.4-2 | exec-summary 레이아웃 (좌50%+우50%) | renderExecSummary 구현 | ✅ PASS |
| 4.4-3 | compare-slide (좌Before/우After) | renderCompareSlide 구현 | ✅ PASS |
| 4.4-4 | before-after-slide (상Before/하After+화살표) | renderBeforeAfterSlide 구현 | ✅ PASS |
| 4.4-5 | scenario-slide (카드 2~3개 가로) | renderScenarioSlide 구현 | ✅ PASS |
| 4.4-6 | roadmap-slide (3단계 타임라인) | renderRoadmapSlide 구현 | ✅ PASS |
| 4.4-7 | gan-slide (좌추진론/우반대론) | renderGanSlide 구현 | ✅ PASS |
| 4.4-8 | impact-slide (리스트+수치) | renderImpactSlide 구현 | ✅ PASS |
| 4.4-9 | content/data/org/strategy/closing | 각 함수 구현 | ✅ PASS |
| 4.5 | PptxDesignConfig interface (10필드) | 10필드 정확 일치 | ✅ PASS |
| 4.6 | buildDesignConfig(tokens) 헬퍼 | 6개 토큰 키 매핑 구현 | ✅ PASS |

### §5. Export Service 확장

| # | Design 항목 | 구현 | 결과 |
|---|------------|------|------|
| 5.1 | exportPptx(orgId, offeringId): Promise<Uint8Array \| null> | 시그니처 일치 | ✅ PASS |
| 5.2 | getOfferingData private helper 추출 | 구현 완료, exportHtml도 리팩토링 | ✅ PASS |

### §6. Route 확장

| # | Design 항목 | 구현 | 결과 |
|---|------------|------|------|
| 6.1 | format=pptx 분기 | if (format === "pptx") 분기 | ✅ PASS |
| 6.2 | PPTX Content-Type 헤더 | application/vnd.openxmlformats-officedocument.presentationml.presentation | ✅ PASS |
| 6.3 | Content-Disposition attachment | `filename="${id}.pptx"` | ✅ PASS |

### §7. 테스트

| # | Design 항목 | 구현 | 결과 |
|---|------------|------|------|
| 7.1 | format=pptx → 200 + Content-Type | 테스트 #1 | ✅ PASS |
| 7.2 | PK zip 시그니처 (50 4B 03 04) | 테스트 #2 | ✅ PASS |
| 7.3 | 404 for non-existent | 테스트 #3 | ✅ PASS |
| 7.4 | 기본 html 응답 | 테스트 #4 | ✅ PASS |
| 7.5 | included 섹션 포함 | 테스트 #5 | ✅ PASS |
| 7.6 | 디자인 토큰 적용 | 테스트 #6,7,8 (buildDesignConfig 3건) | ✅ PASS |
| 7.7 | SECTION_SLIDE_MAP 정합성 | 테스트 #9,10,11,12 | ✅ PASS |

### §8. 구현 순서 + 의존성

| # | Design 항목 | 구현 | 결과 |
|---|------------|------|------|
| 8.1 | pptxgenjs 의존성 추가 | package.json에 pptxgenjs@^4.0.1 | ✅ PASS |

### §1. 변경 범위

| # | Design 항목 | 구현 | 결과 |
|---|------------|------|------|
| 1.1 | 7개 파일 변경 범위 | 7개 모두 일치 | ✅ PASS |

## Gap 항목 (FAIL)

| # | 항목 | 원인 | 심각도 |
|---|------|------|--------|
| G1 | pptx-renderer.ts에서 PptxGenJS 타입을 `any`(PptxPres/PptxSlide 수동 인터페이스)로 사용 | pptxgenjs v4의 `export as namespace` + NodeNext 호환 문제 — 런타임 동작에 영향 없음 | 🟢 Low |

## 요약

- **33/34 항목 PASS** → Match Rate **97%**
- 유일한 gap(G1)은 타입 수준 차이로, 런타임 동작에 영향 없음
- 기존 HTML export 테스트 6건도 전체 통과 (회귀 없음)
- 12건 신규 테스트 전체 통과
