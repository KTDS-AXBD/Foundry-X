# Sprint 197 Report — F413 Foundry-X 수집 코드 격리

**Report ID:** FX-RPT-S197
**F-item:** F413
**Phase:** 21-E
**Sprint:** 197
**Date:** 2026-04-07
**Status:** ✅ Done
**Owner:** Sinclair

## Sprint 결과

Discovery-X 이관 대상 14개 파일을 `packages/api/src/core/collection/`으로 격리 완료. Strangler Fig 사전 정리로서 도메인 경계를 명확히 하였고, typecheck 0 errors와 전체 테스트 통과를 유지했다.

## 작업 내역

### 디렉터리/파일 이동
- `core/collection/{routes,services,schemas}` 디렉터리 생성
- `git mv`로 14개 파일 이동 (R 100% 보존)
  - routes: ax-bd-ideas, ax-bd-insights, collection, ir-proposals
  - services: collection-pipeline, discovery-x-ingest-service, idea-service, insight-agent-service, ir-proposal-service
  - schemas: collection, discovery-x.schema, idea.schema, insight-job.schema, ir-proposal.schema

### Barrel 정리
- `core/collection/index.ts` 신설 (5 routes export)
- `core/discovery/index.ts`: 12 → 9 routes (수집 4종 제거)
- `core/shaping/index.ts`: 14 → 13 routes (axBdInsightsRoute 제거)
- `core/index.ts`: collection re-export 추가

### Cross-module 경로 수정 (6 파일)
- `core/collection/routes/ax-bd-insights.ts` (3건 → shaping/schemas)
- `core/collection/routes/collection.ts` (1건 → discovery/services)
- `core/discovery/routes/ax-bd-discovery.ts` (2건 → collection/services)
- `core/discovery/services/agent-collector.ts` (1건 → collection/services)
- `core/shaping/services/idea-bmc-link-service.ts` (1건 → collection/services)

### 테스트 파일 import 패치 (8 파일)
- collection-agent, ir-proposals, ir-proposal-service, ax-bd-links, ax-bd-discovery (2 lines), ax-bd-ideas, ax-bd-insights

### app.ts 정합성
- core barrel import 블록에 collection 5종 추가
- 5 mount 라인 복원: ideaPortalWebhookRoute, collectionRoute, axBdIdeasRoute, axBdInsightsRoute, irProposalsRoute

## 검증

| 항목 | 결과 |
|------|------|
| typecheck (api) | ✅ 0 errors |
| 전체 테스트 (api) | ✅ 3167 passed / 1 skipped (310 files) |
| Lint | ✅ 통과 |
| `git log --diff-filter=R` | ✅ 14 R(rename) 확인 |

## Phase 21 누적

- Phase 21 (Gate-X): F402~F412 (Sprint 189~196)
- Phase 21-E (사전 정리): F413 (Sprint 197) ← 본 Sprint
- 누적 F-item: 12건 (F402~F413)

## 후속 작업

- Phase 21+ 본 추출 단계에서 `core/collection/` 디렉터리를 통째로 외부 Discovery-X 리포로 이관
- harness-kit event bus로 양 서비스 간 비동기 통신 구성
- 잔여 Cross-module import는 추출 시 이벤트/HTTP 경계로 전환
