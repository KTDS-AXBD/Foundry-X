---
code: FX-ANLS-S220
title: "Sprint 220 Gap Analysis — PRD 자동 생성 파이프라인"
version: 1.0
status: Active
category: ANLS
created: 2026-04-08
updated: 2026-04-08
author: Claude (gap-detector)
references: "[[FX-PLAN-S220]], [[FX-DSGN-S220]]"
---

# Sprint 220 Gap Analysis

## Overall Match Rate: 96% — PASS

| Category | Score |
|----------|:-----:|
| Design Match | 95% |
| Architecture Compliance | 100% |
| Convention Compliance | 98% |
| **Overall** | **96%** |

## Verification Results

### F454 (Must Have V1~V5): 5/5 PASS

| # | Verification | Status |
|---|-------------|--------|
| V1 | HTML 파싱 — 7개 중 5개 이상 추출 | ✅ PASS |
| V2 | 폴백 — rawText 기반 처리 | ✅ PASS |
| V3 | source_type='business_plan' + bp_draft_id 저장 | ✅ PASS |
| V4 | API 201 응답 + PRD 마크다운 반환 | ✅ PASS |
| V5 | 사업기획서 미연결 404 | ✅ PASS |

### F455 (Must Have V7~V9): 3/3 PASS

| # | Verification | Status |
|---|-------------|--------|
| V7 | 인터뷰 시작 — 5~8개 질문 생성 | ✅ PASS |
| V8 | 응답 저장 — prd_interview_qas UPDATE | ✅ PASS |
| V9 | 2차 PRD — 마지막 응답 시 version=2 생성 | ✅ PASS |

### Should Have (V10~V13): 4/4 PASS

| # | Verification | Status |
|---|-------------|--------|
| V10 | PRD 미존재 시 인터뷰 404 | ✅ PASS |
| V11 | 중복 인터뷰 방지 409 | ✅ PASS |
| V12 | UI 질문-응답 루프 | ✅ PASS (코드 확인) |
| V13 | 2차 PRD [보강] 마커 | ✅ PASS |

## Test Coverage: 23건 전체 PASS

| Test File | Tests | Status |
|-----------|:-----:|:------:|
| bp-html-parser.test.ts | 7 | ✅ |
| bp-prd-generator.test.ts | 6 | ✅ |
| prd-interview-service.test.ts | 6 | ✅ |
| prd-interview-flow.test.ts | 4 | ✅ |

## API Endpoint Comparison

| Endpoint | Design | Implementation | Status |
|----------|--------|----------------|--------|
| POST /biz-items/:id/generate-prd-from-bp | O | O | PASS |
| POST /biz-items/:id/prd-interview/start | O | O | PASS |
| POST /biz-items/:id/prd-interview/answer | O | O | PASS |
| GET /biz-items/:id/prd-interview/status | O | O | PASS |

## Differences Summary

### MISSING (Design O, Implementation X): 0건

### ADDED (유용한 보강): 6건

| Item | Description |
|------|-------------|
| `BpSectionKey` 타입 | 섹션 키 강타입화 |
| `countStandardSections()` | 테스트 편의 유틸 |
| `getLatestBpPrd()` | 최신 BP PRD 조회 |
| Progress bar | 인터뷰 진행률 시각화 |
| `INVALID_REQUEST` 400 | answer 요청 검증 |
| api-client 래퍼 4개 | Web 호출용 함수 |

### CHANGED (Low impact, 의도적): 3건

| Item | Design | Implementation |
|------|--------|----------------|
| Interview start response | `interviewId` 필드 | `id` (타입 일관성) |
| FK cascade | 미명시 | ON DELETE CASCADE 추가 |
| PRD 생성 실패 에러 | PRD_GENERATION_FAILED | 500 자동 처리 |
