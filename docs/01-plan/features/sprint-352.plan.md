---
code: FX-PLAN-352
title: Sprint 352 — F628 BeSir 7-타입 Entity 모델 (T1 토대)
version: 1.0
status: Active
category: PLAN
created: 2026-05-06
updated: 2026-05-06
sprint: 352
f_item: F628
req: FX-REQ-693
priority: P2
---

# Sprint 352 — F628 BeSir 7-타입 Entity 모델 (T1 토대)

> SPEC.md §5 F628 row가 권위 소스. 본 plan은 17 internal dev plan §3 T1 토대 두 번째 sprint로서 실행 절차 + Phase Exit 체크리스트.

## §1 배경 + 사전 측정

17 plan §3 Tier 1 토대 3건 중 두 번째.

| BeSir 7-타입 | 정의 |
|--------------|------|
| **Fact** | 숫자로 나타나는 객체 (매출액, 고객만족도) |
| **Dimension** | Fact를 가르는 기준 (프로젝트별, 고객별) |
| **Workflow** | 업무 흐름 |
| **Event** | 사건 |
| **Actor** | 주체/담당자 |
| **Policy** | 룰/규칙 |
| **Support** | 위 6개를 보조하는 정보 |

### F593 entity 도메인 현황 (Sprint 339 신설)

| File | LOC 추정 | 역할 |
|------|---------|------|
| `core/entity/routes/entities.ts` | ~150 | Hono routes (POST /entities, GET /entities, POST /entities/links) |
| `core/entity/services/entity-registry.ts` | ~230 | EntityRegistryService (registerEntity, searchEntities, linkEntities, getLinks, syncEntity) |
| `core/entity/schemas/entity.ts` | ~100 | RegisterEntitySchema, SearchEntitiesSchema, LinkEntitiesSchema, EntityResponseSchema |
| `core/entity/types.ts` | re-export | services/schemas re-export |

### D1 테이블 (현)

```sql
service_entities (
  id, service_id, entity_type, external_id, title, status, metadata, org_id, synced_at
)
entity_links (
  id, source_id, target_id, link_type, metadata, created_at
)
```

`entity_type`은 freeform string. service_id enum: foundry-x / discovery-x / ai-foundry.

## §2 인터뷰 4회 패턴 (S336, 31회차)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 메인 결정 | T1 토대 두 번째 = F628 7-타입 Entity | F593 entity 도메인 확장 |
| 2차 옵션 | **A dual-track** (besir_type 컬럼 추가, legacy 호환) | breaking 0, T1 토대 적합 |
| 3차 속성 범위 | **기본 구조만** (workflow_steps + Fact-Dimension 의존은 metadata jsonb 재사용) | F630 자동 추출에서 본격화 |
| 4차 시동 | **즉시 (Sprint 351과 병렬)** | F606 의존 0, 다른 도메인 |

## §3 범위 (a~g)

### (a) D1 migration `0141_entity_besir_type.sql`

```sql
-- F628: BeSir 7-타입 Entity 모델 (T1 토대)
-- 옵션 A dual-track: besir_type 컬럼 추가, 기존 entity_type freeform 유지

ALTER TABLE service_entities ADD COLUMN besir_type TEXT;

-- BeSir 7-타입 enum 강제 (NULL 허용 — legacy 호환)
-- SQLite는 ADD COLUMN 시 CHECK 제약을 직접 못 거니, 별 트리거로 강제

CREATE TRIGGER service_entities_besir_type_check_insert
BEFORE INSERT ON service_entities
WHEN NEW.besir_type IS NOT NULL
  AND NEW.besir_type NOT IN ('fact','dimension','workflow','event','actor','policy','support')
BEGIN
  SELECT RAISE(ABORT, 'besir_type must be one of: fact, dimension, workflow, event, actor, policy, support');
END;

CREATE TRIGGER service_entities_besir_type_check_update
BEFORE UPDATE ON service_entities
WHEN NEW.besir_type IS NOT NULL
  AND NEW.besir_type NOT IN ('fact','dimension','workflow','event','actor','policy','support')
BEGIN
  SELECT RAISE(ABORT, 'besir_type must be one of: fact, dimension, workflow, event, actor, policy, support');
END;

CREATE INDEX idx_service_entities_besir_type
  ON service_entities(besir_type)
  WHERE besir_type IS NOT NULL;
```

### (b) `core/entity/types.ts` 갱신

```typescript
// BeSir 7-타입 (06_architecture_alignment_with_besir_v1.md §1.2)
export const BESIR_ENTITY_TYPES = [
  "fact",       // 숫자로 나타나는 객체
  "dimension",  // Fact를 가르는 기준
  "workflow",   // 업무 흐름
  "event",      // 사건
  "actor",      // 주체/담당자
  "policy",     // 룰/규칙
  "support",    // 위 6개 보조
] as const;

export type BesirEntityType = typeof BESIR_ENTITY_TYPES[number];

export interface BesirEntity {
  id: string;
  serviceId: string;
  entityType: string;        // legacy freeform
  besirType?: BesirEntityType; // BeSir 7-타입 (optional)
  externalId: string;
  title: string;
  status: string | null;
  metadata: Record<string, unknown> | null;
  orgId: string;
  syncedAt: string;
}

// 기존 export 재유지
export { EntityRegistryService } from "./services/entity-registry.js";
export * from "./schemas/entity.js";
```

### (c) `core/entity/schemas/entity.ts` 갱신

```typescript
import { BESIR_ENTITY_TYPES } from "../types.js";

export const BesirEntityTypeSchema = z.enum(BESIR_ENTITY_TYPES);

// RegisterEntitySchema에 추가
besirType: BesirEntityTypeSchema.optional().openapi({ description: "BeSir 7-타입 (선택)" }),

// SearchEntitiesSchema에 추가
besirType: BesirEntityTypeSchema.optional(),

// EntityResponseSchema에 추가
besirType: z.enum(BESIR_ENTITY_TYPES).nullable(),
```

### (d) `core/entity/services/entity-registry.ts` 갱신

```typescript
// registerEntity:
//   INSERT besir_type 포함, NULL 허용
//   `INSERT INTO service_entities (id, service_id, entity_type, besir_type, external_id, title, status, metadata, org_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`

// searchEntities:
//   params.besirType 처리, WHERE besir_type = ? 절 추가
//   if (params.besirType) { where += " AND besir_type = ?"; binds.push(params.besirType); }

// SELECT * 로 가져온 row.besir_type을 BesirEntityType | null로 mapping
```

### (e) 기존 호환성

- entityType freeform 유지 (Sprint 339 데이터 회귀 0)
- besirType은 optional (NULL 허용)
- 기존 RegisterEntity 요청 형식은 그대로 작동

### (f) typecheck + vitest GREEN

- 회귀 0 확증
- 신규 unit test 1건: 잘못된 besir_type INSERT 시 trigger ABORT 검증

### (g) Phase Exit P-a~P-l 12항 (§4)

## §4 Phase Exit 체크리스트

| ID | 항목 | 측정 방법 | 기준 |
|----|------|----------|------|
| P-a | D1 migration 적용 OK + besir_type 컬럼 존재 | `wrangler d1 execute foundry-x-db --command "PRAGMA table_info(service_entities)"` | besir_type column 존재 |
| P-b | CHECK 제약 동작 검증 | unit test (잘못된 enum INSERT 시 ABORT) | PASS |
| P-c | types.ts BesirEntityType + BesirEntity export | `grep "BesirEntityType\|BesirEntity" packages/api/src/core/entity/types.ts` | 둘 다 export |
| P-d | schemas/entity.ts 4 schema 갱신 | grep | Register/Search/Response/BesirEntityTypeSchema 모두 |
| P-e | entity-registry.ts INSERT/SELECT 처리 | grep `besir_type` | INSERT/SELECT 모두 |
| P-f | typecheck + tests GREEN | `pnpm -F api typecheck && pnpm -F api test` | 회귀 0 (legacy entityType freeform 유지) |
| P-g | dual_ai_reviews sprint 352 자동 INSERT | D1 query | ≥ 1건 (hook 27 sprint 연속, 누적 ≥ 38건) |
| P-h | F614/F627/F606 baseline=0 회귀 | `bash scripts/lint-baseline-check.sh` | exit 0 |
| P-i | F587~F627 회귀 측정 12항 | grep + count | 모든 항목 회귀 0 |
| P-j | Match ≥ 90% | gap-detector | semantic 100% 목표 |
| P-k | MSA cross-domain baseline=0 유지 | `bash scripts/lint-baseline-check.sh` | 0 |
| P-l | API smoke `/api/entities` 7-타입 동작 | curl POST + GET filter | besirType=workflow INSERT + GET 필터 동작 |

## §5 전제

- F593 entity 도메인 ✅ (Sprint 339)
- F606 audit-bus는 의존 X (병렬 가능)
- D1 migration 0141 (0140 audit-bus와 충돌 없음 — 다른 테이블)

## §6 예상 시간

- autopilot **~10분** (단일 D1 migration + types/schemas 추가 + service 갱신, 기존 entity 도메인 확장이라 단순)

## §7 다음 사이클 후보 (F628 후속)

- **Sprint 353 — F629** 5-Asset Model 확장 (T1 토대 세 번째)
- **Sprint 354 — F630** 인터뷰 → 7-타입 자동 추출 (F628 의존, T2)
- Sprint 355~ — F631 자동화 정책 / F632 CQ 5축 등
