---
code: FX-DSGN-361
title: Sprint 361 — F616 Launch-X Solo Design
version: 1.0
status: Active
category: DESIGN
created: 2026-05-06
updated: 2026-05-06
sprint: 361
f_item: F616
req: FX-REQ-681
priority: P2
---

# Sprint 361 — F616 Launch-X Solo Design

> Plan: `docs/01-plan/features/sprint-361.plan.md`
> 패턴: ethics 도메인 (`core/ethics/`) 구조 적용

## §1 아키텍처

```
packages/api/src/core/launch/
├── types.ts                        (LaunchType enum + 4 interfaces + re-export)
├── schemas/
│   └── launch.ts                   (Zod: 4 schemas)
├── services/
│   └── launch-engine.service.ts   (LaunchEngine class: 4 methods)
├── routes/
│   └── index.ts                   (Hono sub-app: 3 endpoints)
└── launch-engine.test.ts          (TDD: 1 test case)

packages/api/src/db/migrations/
└── 0148_launch_artifacts.sql      (3 tables: type1 + type2 + decisions)

packages/api/src/app.ts            (mount: /api/launch)
```

## §2 데이터 플로우

```
POST /api/launch/package
  └─ LaunchEngine.package(input)
       └─ sha256 계산 (crypto.subtle)
       └─ LaunchManifest { releaseId, sha256, ... } 반환

POST /api/launch/deploy
  └─ body.launchType === 1 → publishType1(manifest)
       └─ launch_artifacts_type1 INSERT
       └─ recordDecision(manifest, 1)
            └─ launch_decisions INSERT
            └─ AuditBus.emit("launch.completed")
  └─ body.launchType === 2 → deployType2(manifest)
       └─ launch_runtimes_type2 INSERT
       └─ recordDecision(manifest, 2)

GET /api/launch/status/:release_id
  └─ launch_decisions SELECT WHERE release_id = ?
```

## §3 TDD 계약 (Red Target)

| # | 시나리오 | 검증 |
|---|---------|------|
| T1 | package(input) → manifest 반환 + sha256 존재 + publishType1 → type1 INSERT + decisions INSERT + audit emit "launch.completed" | launch_artifacts_type1 INSERT + launch_decisions INSERT + bus.emit 호출 |

## §4 인터페이스 계약

### types.ts exports
- `LaunchType` = `1 | 2`
- `LaunchManifest` { releaseId, orgId, launchType, artifactRef, sha256, metadata, generatedAt }
- `LaunchArtifactType1` { releaseId, orgId, downloadUrl, manifestPath, zipSize, sha256, expiresAt, createdAt }
- `LaunchRuntimeType2` { releaseId, orgId, invokeEndpoint, runtimeVersion, status, createdAt }
- `LaunchDecisionRecord` { id, releaseId, orgId, launchType, manifest, auditEventId, decidedAt }

### LaunchEngine methods
- `package(input)` → `Promise<LaunchManifest>` — sha256 + UUID 발급
- `publishType1(manifest)` → `Promise<LaunchArtifactType1>` — D1 INSERT + recordDecision
- `deployType2(manifest)` → `Promise<LaunchRuntimeType2>` — D1 INSERT + recordDecision
- `recordDecision(manifest, launchType)` → `Promise<void>` — D1 INSERT + audit emit (private)

### 3 endpoints
- `POST /launch/package` — `{ orgId, artifactRef, metadata? }` → `LaunchManifest`
- `POST /launch/deploy` — `{ releaseId, launchType }` → artifact (type1 or type2)
- `GET /launch/status/:release_id` — → `{ decisions: LaunchDecisionRecord[] }`

## §5 파일 매핑 (Gap Analysis 기준)

| 파일 | 작업 | 신규/수정 |
|------|------|----------|
| `packages/api/src/db/migrations/0148_launch_artifacts.sql` | 3 테이블 생성 | 신규 |
| `packages/api/src/core/launch/types.ts` | 4 인터페이스 + re-export | 신규 |
| `packages/api/src/core/launch/schemas/launch.ts` | 4 Zod schemas | 신규 |
| `packages/api/src/core/launch/services/launch-engine.service.ts` | LaunchEngine class | 신규 |
| `packages/api/src/core/launch/routes/index.ts` | launchApp Hono sub-app | 신규 |
| `packages/api/src/core/launch/launch-engine.test.ts` | TDD T1 | 신규 |
| `packages/api/src/app.ts` | `/api/launch` mount 1줄 | 수정 |

## §6 MSA 준수

- `core/launch/` 전용 신규 도메인 — `routes/`, `services/` 루트 직접 추가 없음
- 도메인 간 import: `../../infra/types.js` (AuditBus) — infra는 허용된 공통 의존
- Hono sub-app 패턴: `launchApp` export → `app.route("/api/launch", launchApp)`

## §7 Phase Exit (Plan §4 동일)

P-a~P-l 12항 (Plan 문서 §4 참조)
