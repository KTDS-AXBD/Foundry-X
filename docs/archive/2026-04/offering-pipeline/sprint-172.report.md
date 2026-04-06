---
code: FX-RPRT-S172
title: "Sprint 172 완료 보고서 — offering-pptx 구현 (F380)"
version: 1.0
status: Active
category: RPRT
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
references: "[[FX-PLAN-S172]], [[FX-DSGN-S172]], [[FX-ANLS-S172]]"
---

# Sprint 172 완료 보고서: offering-pptx 구현 (F380)

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F380 — offering-pptx 구현: PPTX 생성 엔진 + 표준 목차 슬라이드 변환 |
| Sprint | 172 |
| Phase | 18-D (Integration) |
| 기간 | 2026-04-07 |
| Match Rate | **97%** (33/34 PASS) |

### Results Summary

| 지표 | 값 |
|------|------|
| Match Rate | 97% |
| 변경 파일 | 7개 (수정 4 + 신규 3) |
| 신규 LOC | ~450줄 |
| 테스트 | 12 pass (신규) + 6 pass (기존 HTML) |
| Gap 항목 | 1건 (Low — 타입 수준) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Offering export가 HTML만 지원 — 경영회의/고객 제안에 PPT 필수 |
| Solution | pptxgenjs 엔진으로 18섹션→31장 슬라이드 자동 변환 + 디자인 토큰 매핑 |
| Function UX Effect | GET /offerings/:id/export?format=pptx → .pptx 파일 다운로드 |
| Core Value | 수작업 PPT 제작(2~3일) → 자동 생성(수초) 전환, HTML/PPTX 듀얼 포맷 완성 |

## 구현 산출물

### 신규 파일

| 파일 | 역할 | LOC |
|------|------|-----|
| `services/pptx-renderer.ts` | 15종 슬라이드 타입별 PPTX 렌더러 | ~300 |
| `services/pptx-slide-types.ts` | 슬라이드 타입 + 섹션→슬라이드 매핑 상수 | ~75 |
| `__tests__/offering-export-pptx.test.ts` | PPTX export API + 유닛 테스트 12건 | ~170 |

### 수정 파일

| 파일 | 변경 |
|------|------|
| `schemas/offering-export.schema.ts` | ExportFormatSchema에 "pptx" 추가 |
| `services/offering-export-service.ts` | exportPptx() 추가 + getOfferingData 공통 쿼리 추출 |
| `routes/offering-export.ts` | format=pptx 분기 + Content-Type/Disposition 헤더 |
| `packages/api/package.json` | pptxgenjs@^4.0.1 의존성 추가 |

## 기술 결정

### pptxgenjs 선정 근거

| 기준 | pptxgenjs | python-pptx |
|------|----------|-------------|
| Workers ESM | ✅ | ❌ |
| 패키지 크기 | ~300KB | ~50MB |
| 타입 | TypeScript 네이티브 | subprocess |

### NodeNext ESM interop 해결

pptxgenjs v4는 `export as namespace` + `export default class` 혼합 export를 사용하여 NodeNext에서 `new PptxGenJS()`가 타입 에러. `createRequire(import.meta.url)` CJS fallback + 자체 인터페이스(`PptxPres`, `PptxSlide`) 정의로 해결. 런타임 동작에 영향 없음.

## 테스트 결과

| 구분 | 테스트 | 결과 |
|------|--------|------|
| API | format=pptx 200 + Content-Type | ✅ |
| API | PK zip 시그니처 검증 | ✅ |
| API | 404 for non-existent | ✅ |
| API | 기본 html 응답 | ✅ |
| API | included 섹션 포함 | ✅ |
| Unit | buildDesignConfig 기본값 | ✅ |
| Unit | buildDesignConfig 오버라이드 | ✅ |
| Unit | # prefix 제거 | ✅ |
| Unit | STANDARD_SECTIONS 매핑 커버리지 | ✅ |
| Unit | 필수 슬라이드 수 29장 | ✅ |
| Unit | 전체 슬라이드 수 31장 | ✅ |
| Unit | getSlideMapping 조회 | ✅ |
| 기존 | HTML export 6건 회귀 없음 | ✅ |

## 제외 사항 (의도적)

| 항목 | 사유 | 예정 |
|------|------|------|
| Cowork PPTX 연동 | 인터페이스만 정의 | Cowork MCP 연동 시점 |
| 동적 차트 렌더링 | data-slide에 테이블 형태 | Phase 후반 |
| 슬라이드 애니메이션 | SKILL.md 원칙: 없음 | N/A |
| 폰트 임베딩 | Pretendard 참조만 | 뷰어 측 폰트 |

## PDCA 산출물

| 문서 | 코드 |
|------|------|
| Plan | FX-PLAN-S172 |
| Design | FX-DSGN-S172 |
| Analysis | FX-ANLS-S172 |
| Report | FX-RPRT-S172 |
