---
code: FX-PLAN-S174
title: "Sprint 174 — E2E 파이프라인 테스트 + BD ROI 메트릭"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Claude
sprint: 174
f_items: [F383]
phase: "18-E"
---

# Sprint 174 Plan — E2E 파이프라인 테스트 + BD ROI 메트릭

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F383 발굴→형상화→검증 E2E 파이프라인 테스트 + Offering 메트릭 수집 |
| 시작일 | 2026-04-07 |
| Phase | 18-E (Offering Pipeline — Polish, Phase 18 최종) |
| 선행 의존 | F376 (에디터 ✅), F381 (토큰 ✅), F372 (Export ✅), F382 (Prototype ✅), F274 (스킬 메트릭 ✅), F278 (BD ROI ✅) |

| 관점 | 내용 |
|------|------|
| Problem | Offering 파이프라인 21개 F-item이 개별 구현되었으나 전체 흐름 E2E 검증 없음. Offering 운영 메트릭이 BD ROI 대시보드와 연동되지 않음 |
| Solution | Playwright E2E 파이프라인 테스트 + offering-metrics API + BD ROI 연동 서비스 |
| Function UX Effect | 발굴→Offering 생성→편집→토큰→Export→Prototype→검증 전 과정 자동 검증. ROI 대시보드에서 Offering 생산성 확인 |
| Core Value | Phase 18 품질 보증 완성 + 운영 지표 기반 의사결정 (Offering 생성 시간, 검증 통과율 등) |

---

## 1. 목표

### 1-A. E2E 파이프라인 테스트
- **발굴→형상화→검증 전체 흐름**: 발굴 아이템 → Offering 생성 → 섹션 편집 → 디자인 토큰 → Export (HTML/PPTX) → Prototype 생성 → 검증 실행
- Playwright 테스트로 Web UI 전 과정 자동화 검증
- 기존 E2E mock-factory 패턴 활용

### 1-B. Offering 메트릭 수집 API
- Offering 생성/편집/Export/검증 이벤트를 skill_executions 테이블에 기록 (F274 연동)
- 메트릭 집계 API: `GET /offerings/metrics` (기간별 생성 수, 평균 완성 시간, Export 건수, 검증 통과율)

### 1-C. BD ROI 연동
- BdRoiCalculatorService에 Offering 메트릭 통합
- Offering 생산성 지표 → ROI 대시보드 확장 (savings 산출: 수동 대비 자동화 시간 절감)

---

## 2. 선행 조건 확인

| 의존성 | 상태 | 근거 |
|--------|------|------|
| F376 Offering 에디터 | ✅ | `packages/web/src/routes/offering-editor.tsx` |
| F381 디자인 토큰 에디터 | ✅ | `packages/api/src/routes/design-tokens.ts`, Sprint 173 PR #314 |
| F372 Export API | ✅ | `packages/api/src/routes/offering-export.ts` |
| F382 Prototype 연동 | ✅ | `packages/api/src/routes/offering-prototype.ts`, Sprint 173 PR #314 |
| F274 스킬 메트릭 | ✅ | `packages/api/src/routes/skill-metrics.ts`, D1 0080 |
| F278 BD ROI | ✅ | `packages/api/src/routes/roi-benchmark.ts`, D1 0084 |

---

## 3. 기술 접근

### 3-A. E2E 테스트 (Playwright)
- **파일**: `packages/web/e2e/offering-pipeline.spec.ts` (신규)
- **시나리오**: 전체 파이프라인 흐름 + 개별 페이지 기능 검증
- **Mock**: mock-factory에 offering pipeline 시나리오 데이터 추가

### 3-B. Offering 메트릭 API
- **라우트**: `packages/api/src/routes/offering-metrics.ts` (신규)
- **서비스**: `packages/api/src/services/offering-metrics-service.ts` (신규)
- **스키마**: `packages/api/src/schemas/offering-metrics.schema.ts` (신규)
- SkillMetricsService 연동: offering 관련 skill_executions 필터링 + 집계

### 3-C. BD ROI 연동
- BdRoiCalculatorService 확장: Offering 메트릭을 savings 계산에 포함
- 기존 roi-benchmark API에 offering 카테고리 추가

### 3-D. 단위 테스트
- offering-metrics-service.test.ts (서비스 로직)
- offering-metrics-routes.test.ts (API 엔드포인트)
- bd-roi-calculator 확장 테스트

---

## 4. 산출물

| # | 산출물 | 경로 |
|---|--------|------|
| 1 | E2E 파이프라인 테스트 | `packages/web/e2e/offering-pipeline.spec.ts` |
| 2 | Offering 메트릭 라우트 | `packages/api/src/routes/offering-metrics.ts` |
| 3 | Offering 메트릭 서비스 | `packages/api/src/services/offering-metrics-service.ts` |
| 4 | Offering 메트릭 스키마 | `packages/api/src/schemas/offering-metrics.schema.ts` |
| 5 | BD ROI 연동 확장 | `packages/api/src/services/bd-roi-calculator.ts` (수정) |
| 6 | 단위 테스트 | `packages/api/src/__tests__/offering-metrics*.test.ts` |
| 7 | E2E mock 데이터 | `packages/web/e2e/fixtures/mock-factory.ts` (수정) |

---

## 5. 리스크

| 리스크 | 대응 |
|--------|------|
| 기존 E2E mock-factory 패턴과 불일치 | 기존 패턴 분석 후 동일 패턴 적용 |
| skill_executions 테이블 스키마 호환 | F274 스키마 그대로 재활용, offering-specific 필드는 metadata JSON |
| BD ROI 계산식 변경 영향 | 기존 테스트 통과 확인 후 확장 |
