---
code: FX-ANLS-S154
title: "Sprint 154 Gap Analysis — DB 스키마 확장 + 강도 라우팅 UI + output_json POC"
version: "1.0"
status: Active
category: ANLS
created: 2026-04-05
updated: 2026-04-05
author: Sinclair (AI Agent)
sprint: 154
f_items: [F342, F343]
design_ref: "[[FX-DSGN-S154]]"
---

# Sprint 154 Gap Analysis

## 결과 요약

| 항목 | 결과 |
|------|------|
| **Match Rate** | **100%** (15/15 PASS) |
| 신규 파일 | 22개 |
| 수정 파일 | 4개 |
| 테스트 | 18개 (전체 통과) |
| Typecheck | ✅ shared + api + web 전체 통과 |

---

## Design §10 체크리스트

| # | 항목 | 상태 | 비고 |
|---|------|:----:|------|
| 1 | 0098~0101 마이그레이션 4건 SQL 작성 | ✅ PASS | 0098 persona_configs, 0099 persona_evals, 0100 discovery_reports, 0101 team_reviews |
| 2 | mock-d1.ts에 4테이블 추가 | ✅ PASS | CREATE TABLE 4건 추가 |
| 3 | PersonaConfigService + 라우트 + 스키마 + 테스트 | ✅ PASS | CRUD + initDefaults 8인 시딩. 5 tests |
| 4 | PersonaEvalService + 라우트 + 스키마 + 테스트 | ✅ PASS | save + getOverallVerdict 다수결 판정. 5 tests |
| 5 | DiscoveryReportService + 라우트 + 스키마 + 테스트 | ✅ PASS | upsert + shareToken 생성. 5 tests |
| 6 | TeamReview 라우트 + 스키마 + 테스트 | ✅ PASS | 투표 upsert + GROUP BY 집계. 3 tests |
| 7 | shared/discovery-v2.ts 타입 정의 | ✅ PASS | 7개 타입 + 6개 상수 export |
| 8 | IntensityIndicator 컴포넌트 | ✅ PASS | ★/○/△ 배지, core/normal/light 색상 |
| 9 | IntensityMatrix 5×7 그리드 | ✅ PASS | discoveryType 하이라이트, compact 모드 |
| 10 | OutputJsonViewer POC | ✅ PASS | 구조화/원본 토글 + 클립보드 복사 + 접힘/펼침 |
| 11 | WizardStepDetail intensity prop 통합 | ✅ PASS | auto-계산 + 간소 스킵 버튼 |
| 12 | 라우트 등록 (app.ts) | ✅ PASS | 4개 라우트 import + app.route() |
| 13 | typecheck 통과 | ✅ PASS | shared + api + web 전체 |
| 14 | lint 통과 | ✅ PASS | PostToolUse hook 자동 검증 |
| 15 | 테스트 전체 통과 | ✅ PASS | 18 tests (5+5+5+3) |

---

## 파일 변경 내역

### 신규 파일 (22개)

| 패키지 | 파일 | F-item |
|--------|------|--------|
| shared | `src/discovery-v2.ts` | F342 |
| api | `src/db/migrations/0098_persona_configs.sql` | F342 |
| api | `src/db/migrations/0099_persona_evals.sql` | F342 |
| api | `src/db/migrations/0100_discovery_reports.sql` | F342 |
| api | `src/db/migrations/0101_team_reviews.sql` | F342 |
| api | `src/schemas/persona-config-schema.ts` | F342 |
| api | `src/schemas/persona-eval-schema.ts` | F342 |
| api | `src/schemas/discovery-report-schema.ts` | F342 |
| api | `src/schemas/team-review-schema.ts` | F342 |
| api | `src/services/persona-config-service.ts` | F342 |
| api | `src/services/persona-eval-service.ts` | F342 |
| api | `src/services/discovery-report-service.ts` | F342 |
| api | `src/routes/persona-configs.ts` | F342 |
| api | `src/routes/persona-evals.ts` | F342 |
| api | `src/routes/discovery-reports.ts` | F342 |
| api | `src/routes/team-reviews.ts` | F342 |
| api | `src/__tests__/persona-configs.test.ts` | F342 |
| api | `src/__tests__/persona-evals.test.ts` | F342 |
| api | `src/__tests__/discovery-reports.test.ts` | F342 |
| api | `src/__tests__/team-reviews.test.ts` | F342 |
| web | `src/components/feature/discovery/IntensityIndicator.tsx` | F343 |
| web | `src/components/feature/discovery/IntensityMatrix.tsx` | F343 |

### 수정 파일 (4개)

| 패키지 | 파일 | 변경 내용 |
|--------|------|-----------|
| shared | `src/index.ts` | discovery-v2 export 추가 |
| api | `src/app.ts` | 4개 라우트 import + 등록 |
| api | `src/__tests__/helpers/mock-d1.ts` | 4테이블 CREATE TABLE 추가 |
| web | `src/components/feature/discovery/WizardStepDetail.tsx` | intensity prop + indicator + 스킵 버튼 |

---

## Gap 없음 — Match Rate 100%
