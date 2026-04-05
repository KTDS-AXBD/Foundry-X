---
code: FX-PLAN-S154
title: "Sprint 154 — DB 스키마 확장 + 강도 라우팅 UI + output_json POC"
version: "1.0"
status: Active
category: PLAN
created: 2026-04-05
updated: 2026-04-05
author: Sinclair (AI Agent)
sprint: 154
f_items: [F342, F343]
phase: "Phase 15 — Discovery UI/UX 고도화 v2"
---

# Sprint 154 Plan — DB 스키마 확장 + 강도 라우팅 UI + output_json POC

## Executive Summary

| 항목 | 내용 |
|------|------|
| Feature | F342 DB 스키마 확장 + F343 강도 라우팅 UI |
| Sprint | 154 |
| Phase | Phase 15 — Discovery UI/UX 고도화 v2 |
| 예상 기간 | 1 Sprint (autopilot) |
| 의존성 | 없음 (Phase 15 독립 착수) |

### Value Delivered

| 관점 | 내용 |
|------|------|
| Problem | 발굴 결과 시각화·의사결정 화면 없음 → 수작업 PPT 전환 (건당 2~3h) |
| Solution | DB Foundation 4테이블 + 강도 라우팅 시각화 + output_json 렌더링 POC |
| Function UX Effect | Wizard 스텝에 강도 인디케이터 표시, 스킬 결과 JSON 2탭 검증 |
| Core Value | Phase 15 Foundation — 후속 Sprint 155~157의 선행 조건 충족 |

---

## 1. 목표

### F342: DB 스키마 확장
- D1 마이그레이션 4건 (0098~0101): persona_configs, persona_evals, discovery_reports, team_reviews
- API 서비스 3개: PersonaConfigService, PersonaEvalService, DiscoveryReportService
- Zod 스키마: 각 서비스별 input/output 스키마

### F343: 강도 라우팅 UI + output_json POC
- WizardStepDetail 확장: intensity indicator (★핵심/○보통/△간소)
- 5유형(I/M/P/T/S) × 7단계 매트릭스 시각화
- 간소 단계 스킵 옵션 노출
- output_json 렌더링 POC: 기존 데이터 2탭(2-1, 2-2) 검증

---

## 2. 구현 범위

### 2.1 Backend (F342)

| # | 파일 | 설명 |
|---|------|------|
| 1 | `packages/api/src/db/migrations/0098_persona_configs.sql` | ax_persona_configs 테이블 |
| 2 | `packages/api/src/db/migrations/0099_persona_evals.sql` | ax_persona_evals 테이블 |
| 3 | `packages/api/src/db/migrations/0100_discovery_reports.sql` | ax_discovery_reports 테이블 |
| 4 | `packages/api/src/db/migrations/0101_team_reviews.sql` | ax_team_reviews 테이블 |
| 5 | `packages/api/src/services/persona-config-service.ts` | PersonaConfigService (CRUD + 기본 8인 시딩) |
| 6 | `packages/api/src/services/persona-eval-service.ts` | PersonaEvalService (CRUD + 평가 결과 저장) |
| 7 | `packages/api/src/services/discovery-report-service.ts` | DiscoveryReportService (CRUD + 9탭 집계) |
| 8 | `packages/api/src/schemas/persona-config-schema.ts` | Zod 스키마 |
| 9 | `packages/api/src/schemas/persona-eval-schema.ts` | Zod 스키마 |
| 10 | `packages/api/src/schemas/discovery-report-schema.ts` | Zod 스키마 |
| 11 | `packages/api/src/schemas/team-review-schema.ts` | Zod 스키마 |
| 12 | `packages/api/src/routes/persona-configs.ts` | CRUD 라우트 |
| 13 | `packages/api/src/routes/persona-evals.ts` | CRUD 라우트 |
| 14 | `packages/api/src/routes/discovery-reports.ts` | CRUD + 집계 라우트 |
| 15 | `packages/api/src/routes/team-reviews.ts` | CRUD + 투표 라우트 |

### 2.2 Frontend (F343)

| # | 파일 | 설명 |
|---|------|------|
| 1 | `packages/web/src/components/feature/discovery/IntensityIndicator.tsx` | ★/○/△ 강도 배지 |
| 2 | `packages/web/src/components/feature/discovery/IntensityMatrix.tsx` | 5유형×7단계 매트릭스 |
| 3 | `packages/web/src/components/feature/discovery/OutputJsonViewer.tsx` | output_json 렌더링 POC |
| 4 | WizardStepDetail.tsx (수정) | intensity indicator 통합 + 스킵 옵션 |

### 2.3 Shared Types

| # | 파일 | 설명 |
|---|------|------|
| 1 | `packages/shared/src/discovery-v2.ts` | PersonaConfig, PersonaEval, DiscoveryReport, TeamReview 타입 |

### 2.4 Tests

| # | 파일 | 설명 |
|---|------|------|
| 1 | `packages/api/src/__tests__/persona-configs.test.ts` | PersonaConfigService + 라우트 테스트 |
| 2 | `packages/api/src/__tests__/persona-evals.test.ts` | PersonaEvalService + 라우트 테스트 |
| 3 | `packages/api/src/__tests__/discovery-reports.test.ts` | DiscoveryReportService + 라우트 테스트 |
| 4 | `packages/api/src/__tests__/team-reviews.test.ts` | TeamReviewService + 라우트 테스트 |

---

## 3. 기술 설계 요약

### 3.1 DB 스키마 핵심

```sql
-- 0098: ax_persona_configs
-- persona_id(TEXT), item_id(FK→biz_items), weights(JSON: 7축), context_json

-- 0099: ax_persona_evals
-- persona_id, item_id, scores(JSON: 7축), verdict(Go/Conditional/NoGo), summary, concern, condition

-- 0100: ax_discovery_reports
-- item_id(FK→biz_items), report_json(JSON: 9탭), overall_verdict, team_decision, shared_token

-- 0101: ax_team_reviews
-- item_id, reviewer_id(FK→users), decision(Go/Hold/Drop), comment
```

### 3.2 강도 매트릭스

PRD v8.2 기준 5유형별 강도:
- **I(Inbound)**: 2-1~2-3 핵심, 2-4~2-7 보통, 2-8 간소
- **M(Market)**: 2-1~2-4 핵심, 2-5~2-7 보통, 2-8 간소
- **P(Problem)**: 2-1 핵심, 2-2~2-5 핵심, 2-6~2-8 보통
- **T(Tech)**: 2-1~2-2 핵심, 2-3~2-5 보통, 2-6~2-8 간소
- **S(Strategic)**: 전체 핵심 (간소 없음)

### 3.3 output_json POC 전략

기존 `biz_item_discovery_stages` 테이블의 output 데이터를 활용:
1. 2-1(레퍼런스 분석) + 2-2(시장 검증) 결과 JSON 구조 분석
2. 공통 렌더링 컴포넌트(OutputJsonViewer)로 JSON→UI 변환 검증
3. POC 성공 시 Sprint 156~157에서 9탭 리포트 확장

---

## 4. 의존성

| 의존 대상 | 상태 | 비고 |
|-----------|------|------|
| biz_items 테이블 | ✅ 존재 | FK 참조 |
| biz_item_discovery_stages 테이블 | ✅ 존재 (0077) | 기존 단계 데이터 |
| WizardStepDetail.tsx | ✅ 존재 | 확장 대상 |
| Phase 14 (Agent Orchestration) | 독립 | 병렬 진행, 충돌 없음 |

---

## 5. 리스크

| 리스크 | 영향 | 완화 방안 |
|--------|------|-----------|
| 마이그레이션 번호 충돌 | PRD 기준 0096~0099 vs 실제 0098~ | 실제 번호 사용 (0098~0101) |
| output_json 비정형 | 렌더링 POC 실패 가능 | 기존 demo seed 데이터로 구조 확인 후 진행 |
| 기존 Wizard 호환성 | props 추가 시 기존 동작 영향 | optional props + 기본값 패턴 |

---

## 6. 완료 기준

- [ ] D1 마이그레이션 4건 typecheck + 로컬 테스트 통과
- [ ] API 서비스 3개 + 라우트 4개 CRUD 동작
- [ ] Zod 스키마 4개 작성 + 테스트
- [ ] WizardStepDetail에 intensity indicator 표시
- [ ] IntensityMatrix 5×7 시각화 렌더링
- [ ] OutputJsonViewer POC — 2-1, 2-2 탭 JSON 렌더링
- [ ] 전체 typecheck + lint + test 통과
