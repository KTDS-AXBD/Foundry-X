---
id: FX-RPT-293
sprint: 293
f_items: [F538]
date: 2026-04-15
match_rate: 95
status: DONE
---

# Sprint 293 Report — F538 Discovery 완전 분리

## 요약

Discovery 도메인의 3개 clean route를 `packages/api`에서 `packages/fx-discovery` Worker로 완전 분리했다.
Cross-domain 의존성 분석 결과 10개 라우트 중 7개가 18개 이상의 타 도메인 import를 가지고 있어,
F538 범위를 순수 Discovery 전용 3개 라우트로 조정했다.

## F-item

| F-item | REQ | 제목 | 결과 |
|--------|-----|------|------|
| F538 | FX-REQ-575 | Discovery 완전 분리 | ✅ 완료 |

## 구현 내용

### fx-discovery Worker 강화

| 파일 | 변경 |
|------|------|
| `src/middleware/auth.ts` | JWT 검증 미들웨어 (신규) |
| `src/middleware/tenant.ts` | org_members 조회 + TenantVariables (신규) |
| `src/routes/discovery.ts` | GET /api/discovery/progress + /summary (이전) |
| `src/routes/discovery-report.ts` | GET /api/ax-bd/discovery-report/:itemId + /summary (이전) |
| `src/routes/discovery-reports.ts` | GET/PUT/POST /api/ax-bd/discovery-reports/:itemId + /html + /share (이전) |
| `src/services/discovery-progress.ts` | DiscoveryProgressService (이전) |
| `src/services/discovery-report-service.ts` | DiscoveryReportService + HTML + Share Token (이전) |
| `src/services/discovery-criteria.ts` | DISCOVERY_CRITERIA 9기준 데이터 (이전) |

### packages/api 축소

- `discoveryRoute`, `discoveryReportRoute`, `discoveryReportsRoute` 3개 라우트 제거
- `core/index.ts` discovery export 목록 9개로 축소

### fx-gateway 라우팅 확장

- `/api/ax-bd/discovery-reports/*` → fx-discovery 추가
- `/api/ax-bd/discovery-report/*` → fx-discovery 추가

### shared contract 타입

- `packages/shared/src/discovery-contract.ts` 신규: `BdArtifact`, `ExecuteSkillInput`, `ArtifactListQuery`, `SkillExecutionResult`, `TriggerShapingInput`

### Cross-domain import 정리 (Gap 해소)

| 파일 | 변경 |
|------|------|
| `shaping/services/bd-artifact-service.ts` | `../../discovery/schemas/bd-artifact.js` → `@foundry-x/shared` |
| `shaping/services/shaping-orchestrator-service.ts` | `../../discovery/schemas/discovery-pipeline.js` → `@foundry-x/shared` |
| `shaping/services/bd-skill-executor.ts` | `../../discovery/schemas/bd-artifact.js` → `@foundry-x/shared` |
| `shaping/routes/ax-bd-skills.ts` | `executeSkillSchema` 인라인화 (Zod) |
| `agent/services/orchestration-loop.ts` | `graphDiscovery` 분기 제거 (dead code) |

## TDD 결과

| 단계 | 결과 |
|------|------|
| Red | `discovery-migration.test.ts` 6 FAIL (경로 미이식 확인) |
| Green | 12/12 PASS (items 4 + migration 6 + health 2) |

## Gap Analysis

| 항목 | 결과 |
|------|------|
| Match Rate | 95% (G1+G2 해소 후) |
| G1 shaping cross-domain | ✅ 해소 |
| G2 graphDiscovery dead code | ✅ 해소 |
| G3 gateway 스타일 차이 | 무시 (기능 동일) |

## 범위 조정 (F539 예정)

나머지 7개 라우트는 18개 이상 cross-domain 의존성으로 F538 범위 외 처리:
- `bizItemsRoute`, `axBdDiscoveryRoute`, `axBdArtifactsRoute`
- `discoveryPipelineRoute`, `discoveryStagesRoute`
- `discoveryShapePipelineRoute`, `discoveryStageRunnerRoute`

→ F539에서 collection/agent/shaping API를 fx-discovery Service Binding으로 연결하는 방식 검토 예정

## 커밋 이력

| 커밋 | 설명 |
|------|------|
| Red | `test(fx-discovery): F538 red — discovery 완전 분리 마이그레이션 검증` |
| Green | `feat(fx-discovery): F538 green — Discovery 3 routes 분리 완료` |
| Gap | `refactor(api): F538 — shaping cross-domain import + graphDiscovery dead code 제거` |
| Docs | `docs(spec): F538 Sprint 293 Plan + Design 문서` |
