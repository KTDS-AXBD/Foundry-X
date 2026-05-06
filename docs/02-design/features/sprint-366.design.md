---
code: FX-DSGN-366
title: Sprint 366 Design — F618 Launch-X Integration (T5 두 번째)
version: 1.0
status: Active
category: DESIGN
created: 2026-05-06
updated: 2026-05-06
sprint: 366
f_item: F618
req: FX-REQ-683
---

# Sprint 366 Design — F618 Launch-X Integration

> Plan: `docs/01-plan/features/sprint-366.plan.md`
> 의존: F616 Launch-X Solo ✅ MERGED + F606 audit-bus ✅ + F613 ✅

## §1 Overview

F616에서 구축된 `core/launch/` sub-app에 3개 서비스를 추가한다:

| 서비스 | 책임 |
|--------|------|
| SkillRegistryService | Skill Runtime 등록/조회 (D1 skill_registry_entries) |
| ObjectStoreService | Type1 zip stub URL 발급/다운로드 (stub) |
| RollbackService | 직전 버전 rollback 이력 기록 (D1 launch_rollbacks) |

## §2 기존 자산 (F616)

- `core/launch/services/launch-engine.service.ts` — LaunchEngine (package/publishType1/deployType2/recordDecision)
- `core/launch/routes/index.ts` — launchApp, 3 endpoints
- `core/launch/types.ts` — LaunchType/Manifest/ArtifactType1/RuntimeType2/DecisionRecord
- `core/launch/schemas/launch.ts` — LaunchTypeSchema/PackageRequestSchema/DeployRequestSchema/LaunchResponseSchema
- D1: launch_artifacts_type1, launch_runtimes_type2, launch_decisions

## §3 D1 Migration (0152_launch_rollbacks.sql)

### launch_rollbacks (append-only)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| rollback_id | TEXT PK | UUID |
| release_id | TEXT NOT NULL | 대상 릴리스 |
| from_version | TEXT NOT NULL | 롤백 전 버전 |
| to_version | TEXT NOT NULL | 롤백 후 버전 |
| reason | TEXT NOT NULL | 롤백 사유 |
| requester | TEXT NOT NULL | 요청자 |
| executed_at | INTEGER NOT NULL | epoch ms |

### skill_registry_entries
| 컬럼 | 타입 | 설명 |
|------|------|------|
| skill_id | TEXT PK | Skill ID (UPSERT) |
| skill_version | TEXT NOT NULL | 버전 |
| skill_meta | TEXT | JSON |
| active | INTEGER DEFAULT 1 | CHECK(0/1) |
| registered_at | INTEGER NOT NULL | epoch ms |

## §4 테스트 계약 (TDD Red Target)

`__tests__/launch-integration.test.ts`:

1. **SkillRegistryService**: `register({ skillId, skillVersion })` → INSERT + audit `launch.skill_registered` + `lookup(skillId)` 반환
2. **ObjectStoreService**: `uploadZip(releaseId, "content")` → stub URL 반환 + audit `launch.object_store.uploaded`
3. **RollbackService**: `executeRollback(...)` → launch_rollbacks INSERT + audit `launch.rollback.completed` + `getRollbackHistory(releaseId)` → 배열 반환
4. **E2E Type 1**: package → publishType1 → objectStore.uploadZip → rollback → history 1건
5. **E2E Type 2**: package → deployType2 → skillRegistry.register → rollback → history 1건

## §5 파일 매핑 (Worker)

### 신규 파일

| 파일 | 작업 |
|------|------|
| `packages/api/src/db/migrations/0152_launch_rollbacks.sql` | D1 migration |
| `packages/api/src/core/launch/services/skill-registry.service.ts` | SkillRegistryService (register/lookup/listActive) |
| `packages/api/src/core/launch/services/object-store.service.ts` | ObjectStoreService (uploadZip/getDownloadUrl/cleanupExpired) |
| `packages/api/src/core/launch/services/rollback.service.ts` | RollbackService (executeRollback/getRollbackHistory) |
| `packages/api/src/core/launch/__tests__/launch-integration.test.ts` | TDD + E2E Type 1/2 |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `packages/api/src/core/launch/types.ts` | SkillEntry + RollbackRecord + ObjectUploadResult 추가 |
| `packages/api/src/core/launch/schemas/launch.ts` | RegisterSkillSchema + RollbackRequestSchema + RollbackResponseSchema 추가 |
| `packages/api/src/core/launch/routes/index.ts` | 5개 endpoint 추가 (skill-registry/register, rollback, rollback/history, object-store/upload, object-store/download) |

### 불변 파일

| 파일 | 이유 |
|------|------|
| `packages/api/src/app.ts` | `/api/launch` 이미 mount됨 (F616) |
| `packages/api/src/core/launch/services/launch-engine.service.ts` | F616 기존 코드 회귀 없음 |

## §6 audit-bus 이벤트

| 이벤트명 | 발행 시점 |
|----------|----------|
| `launch.skill_registered` | SkillRegistryService.register() |
| `launch.object_store.uploaded` | ObjectStoreService.uploadZip() |
| `launch.rollback.completed` | RollbackService.executeRollback() |

## §7 Phase Exit 체크리스트 (P-a~P-l)

Phase Exit 항목은 Plan §4 참조. 구현 완료 후 검증.
