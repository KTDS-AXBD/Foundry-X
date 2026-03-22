---
code: FX-ANLS-035
title: "Sprint 35 Gap Analysis — F143 모델 비용/품질 대시보드 + F142 Sprint 워크플로우 템플릿"
version: 1.0
status: Active
category: ANLS
created: 2026-03-22
updated: 2026-03-22
author: Sinclair Seo
feature: sprint-35
sprint: 35
match-rate: 89
---

## 1. 분석 개요

| 항목 | 값 |
|------|-----|
| Design 문서 | [[FX-DSGN-035]] |
| 분석 대상 | F143 (모델 비용/품질 대시보드) + F142 (Sprint 워크플로우 템플릿) |
| 분석 일자 | 2026-03-22 |
| 전체 Match Rate | **89%** (56/63 항목) |

## 2. Feature별 Match Rate

| Feature | Design 항목 | 구현 항목 | Match Rate |
|---------|:----------:|:--------:|:----------:|
| F143 모델 비용/품질 대시보드 | 40 | 34 | 85% |
| F142 Sprint 워크플로우 템플릿 | 23 | 22 | 96% |
| **전체** | **63** | **56** | **89%** |

## 3. Gap 상세

### 3.1 미구현 항목 (Design O, Implementation X)

| # | 항목 | Design 위치 | 영향도 | 비고 |
|---|------|------------|:------:|------|
| G1 | TokensPage UI 확장 (3-탭 + 히트맵) | §6.1-6.2 | Medium | 의도적 제외 — API 완성 우선, UI는 Sprint 36+ |
| G2 | POST execute sprintContext 통합 테스트 | §8.2 #12 | Low | 1건 테스트 누락 |
| G3 | days > 365 Zod 제한 | §7 | Low | `.max(365)` 미적용 |
| G4 | Error handling 3건 (테이블 미존재/500, 템플릿 ID 미존재/400, 조건 평가 오류) | §7 | Low | stub 수준 |

### 3.2 Design과 구현의 차이 (변경 항목)

| # | 항목 | Design | 구현 | 판정 |
|---|------|--------|------|:----:|
| D1 | successRate 단위 | 0~1 (e.g., `0.90`) | 0~100 (e.g., `90`) | ⚠️ Design 수정 필요 |
| D2 | tokenEfficiency 계산 | `output_tokens / cost_usd` | `(input+output) / cost_usd` | ⚠️ Design 수정 필요 |
| D3 | sprintTemplateResponse.sprintContext | `.partial()` | `.partial().optional()` | ✅ 개선 방향 |
| D4 | Sprint 노드 label 언어 | 한국어 | 영어 | ✅ 코드 내 일관성 유지 |
| D5 | condition evaluator SprintContext 타입 | `as SprintContext` | `as any` | ⚠️ Minor |
| D6 | Design §8.2 #1 노드 수 | "7노드" (§5.2.1은 10노드) | 10노드 | Design 내부 불일치 |

## 4. 동기화 권장 방향

| Gap | 방향 | 작업 |
|-----|------|------|
| D1 successRate | **Design 수정** | 0~100으로 변경 (KpiLogger 패턴과 일관) |
| D2 tokenEfficiency | **Design 수정** | 총 토큰 기준으로 변경 |
| G1 UI | **이관** | Sprint 36+로 이관 기록 |
| G2 테스트 | **구현 추가** | workflow-sprint.test.ts 1건 추가 |
| G3 days 제한 | **구현 추가** | `.max(365)` 추가 |
| D6 노드 수 | **Design 수정** | §8.2 #1 → 10노드로 수정 |

## 5. 검증 결과

| 검증 항목 | 결과 |
|-----------|------|
| typecheck | ✅ 에러 0건 |
| lint | ✅ |
| API 테스트 | ✅ 629/629 (회귀 0) |
| 아키텍처 준수 | ✅ 95% |
| 컨벤션 준수 | ✅ 98% |
