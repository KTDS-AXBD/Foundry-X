---
code: FX-PLAN-S172
title: "Sprint 172 — Integration: offering-pptx 구현 (F380)"
version: 1.0
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
references: "[[FX-SPEC-001]], [[FX-REQ-372]]"
---

# Sprint 172: offering-pptx 구현 (F380)

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F380 — offering-pptx 구현: PPTX 생성 엔진 + 표준 목차 슬라이드 변환 |
| Sprint | 172 |
| Phase | 18-D (Integration) |
| 우선순위 | P1 |
| 의존성 | F367 ✅ (offering-pptx SKILL.md 등록 + Cowork 연동 설계) |
| PRD | docs/specs/fx-offering-pipeline/prd-final.md §2-4 |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | Offering export가 HTML만 지원 — 경영회의/고객 제안에 PPT 필수 |
| Solution | pptxgenjs 엔진으로 18섹션→31장 슬라이드 자동 변환 + 디자인 토큰 매핑 |
| Function UX Effect | GET /offerings/:id/export?format=pptx → .pptx 파일 다운로드 |
| Core Value | 수작업 PPT 제작(2~3일) → 자동 생성(수초) 전환, HTML/PPTX 듀얼 포맷 완성 |

## 엔진 선정: pptxgenjs

| 기준 | pptxgenjs | python-pptx |
|------|----------|-------------|
| Workers ESM | ✅ | ❌ (subprocess) |
| 패키지 크기 | ~300KB | ~50MB |
| 차트 내장 | ● | ● |
| 한국어 폰트 | ● | ● |

**결정**: pptxgenjs — Workers 호환 + 경량 + TypeScript 네이티브.

## 작업 목록

### A. Schema 확장

| # | 파일 | 변경 |
|---|------|------|
| A1 | `schemas/offering-export.schema.ts` | ExportFormatSchema: `["html"]` → `["html", "pptx"]` |

### B. PPTX 렌더링 서비스 (신규)

| # | 파일 | 내용 |
|---|------|------|
| B1 | `services/pptx-renderer.ts` | pptxgenjs 기반 PPTX 렌더러 — 15종 슬라이드 타입별 레이아웃 |
| B2 | `services/pptx-slide-types.ts` | 슬라이드 타입 정의 + 섹션→슬라이드 매핑 상수 |

### C. Export Service 확장

| # | 파일 | 변경 |
|---|------|------|
| C1 | `services/offering-export-service.ts` | `exportPptx()` 메서드 추가 — exportHtml과 동일 3-query 패턴 |

### D. Export Route 확장

| # | 파일 | 변경 |
|---|------|------|
| D1 | `routes/offering-export.ts` | format=pptx 분기 추가, Content-Type + Content-Disposition 헤더 |

### E. 테스트

| # | 파일 | 내용 |
|---|------|------|
| E1 | `__tests__/offering-export-pptx.test.ts` | PPTX export 성공/404/format 검증 |

## 검증 기준

| # | 기준 | 방법 |
|---|------|------|
| 1 | format=pptx 요청 → PPTX 바이너리 응답 | API test |
| 2 | Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation | API test |
| 3 | 15종 슬라이드 타입 렌더링 | Unit test |
| 4 | 디자인 토큰 → 슬라이드 스타일 매핑 | Unit test |
| 5 | typecheck + lint 통과 | turbo typecheck && turbo lint |

## 리스크

| # | 리스크 | 심각도 | 완화 |
|---|--------|--------|------|
| R1 | pptxgenjs Workers 호환 미확인 | 🟡 | Node.js 모드로 구현, Workers 배포는 추후 검증 |
| R2 | 한국어 폰트 임베딩 | 🟢 | Pretendard 참조만 설정, 뷰어 측 폰트 사용 |
