---
code: FX-DSGN-352
title: Sprint 352 — F628 BeSir 7-타입 Entity 모델 설계
version: 1.0
status: Active
category: DESIGN
created: 2026-05-06
updated: 2026-05-06
sprint: 352
f_item: F628
req: FX-REQ-693
priority: P2
---

# Sprint 352 — F628 BeSir 7-타입 Entity 모델 설계

> Plan: `docs/01-plan/features/sprint-352.plan.md` | SPEC §5 F628

## §1 아키텍처 결정 요약

| 결정 | 내용 | 근거 |
|------|------|------|
| **옵션 A dual-track** | `besir_type` 컬럼 추가, 기존 `entity_type` freeform 유지 | legacy 호환, breaking 0 |
| **NULL 허용** | `besir_type TEXT NULL` — 기존 entity는 NULL로 자동 유지 | Sprint 339 데이터 회귀 없음 |
| **SQLite trigger CHECK** | ADD COLUMN에 CHECK 제약 불가 → BEFORE INSERT/UPDATE trigger로 강제 | SQLite 제약사항 |
| **기본 구조만** | workflow_steps, Fact-Dimension 의존은 metadata jsonb 재사용 | F630 자동 추출 단계에서 본격화 |

## §2 D1 스키마 변경

### 대상 테이블: `service_entities`

```
현재:
  id, service_id, entity_type, external_id, title, status, metadata, org_id, synced_at

변경 후:
  id, service_id, entity_type, external_id, title, status, metadata, org_id, synced_at,
  besir_type TEXT NULL  ← 추가
```

**CHECK 제약 (trigger 방식)**:
- `besir_type IN ('fact','dimension','workflow','event','actor','policy','support')` 또는 NULL
- BEFORE INSERT / BEFORE UPDATE 각각 trigger 생성

**인덱스**: `idx_service_entities_besir_type ON service_entities(besir_type) WHERE besir_type IS NOT NULL`

## §3 BeSir 7-타입 정의

| 타입 | 정의 |
|------|------|
| `fact` | 숫자로 나타나는 객체 (매출액, 고객만족도) |
| `dimension` | Fact를 가르는 기준 (프로젝트별, 고객별) |
| `workflow` | 업무 흐름 |
| `event` | 사건 |
| `actor` | 주체/담당자 |
| `policy` | 룰/규칙 |
| `support` | 위 6개를 보조하는 정보 |

## §4 테스트 계약 (TDD Red Target)

### 파일: `packages/api/src/core/entity/services/entity-registry.test.ts` (신규)

| # | 테스트 케이스 | 기대 결과 |
|---|-------------|---------|
| T1 | `register()` — besirType 없이 (legacy) | 성공, entity.besirType === null |
| T2 | `register()` — besirType='workflow' | 성공, entity.besirType === 'workflow' |
| T3 | `search()` — besirType 필터 | 해당 besirType entity만 반환 |
| T4 | 잘못된 besir_type INSERT → trigger ABORT | 에러 또는 D1 mock ABORT 시뮬레이션 |

## §5 파일 매핑 (변경/신규)

| 파일 | 변경 유형 | 핵심 변경 내용 |
|------|---------|------------|
| `packages/api/src/db/migrations/0141_entity_besir_type.sql` | **신규** | besir_type 컬럼 + 2 trigger + 인덱스 |
| `packages/api/src/core/entity/types.ts` | **수정** | `BESIR_ENTITY_TYPES` const, `BesirEntityType` type, `BesirEntity` interface, re-export EntityRegistry/schemas |
| `packages/api/src/core/entity/schemas/entity.ts` | **수정** | `BesirEntityTypeSchema` (zod enum), RegisterEntitySchema에 `besirType` optional 추가, SearchEntitiesSchema에 `besirType` optional 추가, EntityResponseSchema에 `besirType` nullable 추가 |
| `packages/api/src/core/entity/services/entity-registry.ts` | **수정** | `register()` INSERT에 besir_type 포함, `search()` besirType 필터 절, `mapEntity()` besir_type 매핑, `ServiceEntity` 인터페이스에 `besirType` 추가 |
| `packages/api/src/core/entity/services/entity-registry.test.ts` | **신규** | T1~T4 TDD unit test |

## §6 인터페이스 계약

### EntityRegistry.register() 파라미터 확장

```typescript
register(entity: {
  serviceId: string;
  entityType: string;
  externalId: string;
  title: string;
  status?: string;
  metadata?: Record<string, unknown>;
  orgId: string;
  besirType?: BesirEntityType;  // ← 추가
}): Promise<ServiceEntity>
```

### ServiceEntity 인터페이스 확장

```typescript
interface ServiceEntity {
  // 기존 필드 유지
  id: string; serviceId: string; entityType: string; externalId: string;
  title: string; status: string | null; metadata: Record<string,unknown> | null;
  orgId: string; syncedAt: string;
  besirType: BesirEntityType | null;  // ← 추가
}
```

## §7 호환성 보장

- 기존 `entityType` freeform 유지 (삭제 없음)
- `besirType` optional — 기존 클라이언트는 파라미터 생략 가능
- `ServiceEntity.besirType` nullable — 기존 entity는 null 반환
- `mapEntity()` 반환 시 `row.besir_type ?? null`로 안전 처리

## §8 MSA 규칙 준수

- 신규 파일 없음 (기존 entity 도메인 확장만)
- cross-domain import 없음
- routes/entities.ts 변경 없음 (register/search가 그대로 body→registry.register/search 위임)
