# Sprint 197 Design — F413 core/collection/ 모듈 설계

**Design ID:** FX-DSGN-S197
**F-item:** F413
**Phase:** 21-E
**Sprint:** 197
**Date:** 2026-04-07
**Owner:** Sinclair

## 디렉터리 구조
packages/api/src/core/
├── collection/                      # 🆕 (Phase 20-B → 21-E 정식)
│   ├── index.ts                     # barrel: 5 routes export
│   ├── routes/
│   │   ├── ax-bd-ideas.ts
│   │   ├── ax-bd-insights.ts
│   │   ├── collection.ts            # collectionRoute + ideaPortalWebhookRoute
│   │   └── ir-proposals.ts
│   ├── services/
│   │   ├── collection-pipeline.ts
│   │   ├── discovery-x-ingest-service.ts
│   │   ├── idea-service.ts
│   │   ├── insight-agent-service.ts
│   │   └── ir-proposal-service.ts
│   └── schemas/
│       ├── collection.ts
│       ├── discovery-x.schema.ts
│       ├── idea.schema.ts
│       ├── insight-job.schema.ts
│       └── ir-proposal.schema.ts
├── discovery/                       # 발굴 도메인 (잔류)
└── shaping/                         # 형상화 도메인 (잔류)

## Cross-module Import 정책

`core/collection/`은 `core/discovery/`와 `core/shaping/` 양쪽 모두에서 일부 파일을 참조한다. 경계 가시화를 위해 명시적인 `../../` 상대경로를 사용한다.

| From | To | 사유 |
|------|------|------|
| `core/collection/routes/ax-bd-insights.ts` | `../../shaping/schemas/bmc-insight.schema.js` | BMC 인사이트 스키마 공유 |
| `core/collection/routes/collection.ts` | `../../discovery/services/agent-collector.js` | Agent 수집기 호출 |
| `core/discovery/routes/ax-bd-discovery.ts` | `../../collection/services/discovery-x-ingest-service.js` | 발굴→수집 ingest 트리거 |
| `core/discovery/services/agent-collector.ts` | `../../collection/services/collection-pipeline.js` | 파이프라인 위임 |
| `core/shaping/services/idea-bmc-link-service.ts` | `../../collection/services/idea-service.js` | Idea 도메인 조회 |

## Barrel Export 흐름
core/collection/index.ts
├─ axBdIdeasRoute
├─ collectionRoute
├─ ideaPortalWebhookRoute
├─ irProposalsRoute
└─ axBdInsightsRoute
↓
core/index.ts (barrel)
└─ export * from "./collection/index.js"
↓
app.ts
├─ import { axBdIdeasRoute, collectionRoute, ... } from "./core/index.js"
└─ app.route("/api", ...) × 5

## 설계 결정

- **두 layer 패턴 유지**: `modules/`(HTTP 경계, 이관 대상)와 `core/`(도메인 로직). 이번 작업은 `core/` 내부 격리만 수행.
- **Strangler Fig 사전 단계**: 실제 추출(Phase 21+)을 위한 경계 정리. 코드 동작은 무변경.
- **Rename history 보존**: `git mv` 사용으로 향후 추출 시 git log 추적 가능.

## 검증 전략

1. **typecheck**: 0 errors 유지 (이번 작업 전 baseline = 0)
2. **테스트**: 3167 passed / 1 skipped 유지
3. **Import 정합성**: app.ts 5 mount 라인 + barrel re-export 일치
