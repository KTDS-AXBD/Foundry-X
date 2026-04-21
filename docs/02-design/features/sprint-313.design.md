---
id: FX-DESIGN-313
sprint: 313
features: [F561, F562]
status: design
created: 2026-04-21
---

# Sprint 313 Design — F561 + F562 (Phase 45 MVP M2)

## §1 목표

- **F561**: `foundry-x-discovery-db` 신규 D1 생성 + Shadow Write 검증 + 롤백 리허설 성공
- **F562**: `packages/shared-contracts/` 신규 workspace — Discovery↔Shaping DTO/Event 계약 타입 분리

---

## §2 F561 — D1 discovery_db 분리 PoC

### 2.1 아키텍처 결정

**Option A (채택)**: 신규 D1 생성 + Shadow Write로 점진적 이관
- 이유: 즉시 롤백 가능, prod 영향 없음, Phase Exit 조건(롤백 리허설)과 일치

**Option B (비채택)**: 즉시 프로덕션 전환 — 리스크 R1 과다

### 2.2 Shadow Write 패턴

```
write()
  ├── primaryDB.write(record)    // foundry-x-db (기존)
  └── if DISCOVERY_DB_MODE=shadow:
        discoveryDB.write(record) // foundry-x-discovery-db (신규, 실패해도 무시)
```

read()는 항상 primaryDB (DISCOVERY_DB_MODE 무관).
Shadow Write는 새 DB 상태 검증 전용 — 프로덕션 read 경로에 개입 없음.

### 2.3 Blue-Green 플래그 (미래 활성화용)

```
DISCOVERY_DB_MODE=
  legacy   → 기존 foundry-x-db만 (롤백 시)
  shadow   → 양쪽 write, read는 기존 (현재 PoC)
  primary  → 신규 DB가 primary (Phase 45 완료 후 전환, 이번 Sprint 범위 아님)
```

### 2.4 FK 참조 분석 (D1 체크리스트 D1~D3)

#### FK 끊김 목록 (이동 대상 테이블 → 잔류 테이블 참조)

| 이동 대상 테이블 | FK 참조 | 잔류 테이블 | 처리 방안 |
|----------------|--------|----------|---------|
| `biz_items` | `org_id → organizations(id)` | `organizations` (foundry-x-db 잔류) | Shadow Write 검증에서 org_id 검증 생략 + 문서화 |
| `biz_item_classifications` | `biz_item_id → biz_items(id)` | 같이 이동 → 내부 FK 유지 | OK |
| `biz_evaluations` | FK 없음 확인 필요 | — | 스크립트로 확인 |
| `biz_item_discovery_stages` | `biz_item_id → biz_items(id)` | 같이 이동 | OK |

**핵심 FK 끊김**: `organizations` 테이블이 foundry-x-db 잔류 → `biz_items.org_id` 외래키 강제 불가.
**대응**: discovery-db에서 `org_id`는 application-level 검증으로 대체 (FOREIGN KEY 없이 TEXT만 저장).

#### D2 — 식별자 계약

| 식별자 | 포맷 | 생산자 | 소비자 |
|--------|------|--------|--------|
| `biz_items.id` | `hex(randomblob(16))` lowercase | foundry-x-db INSERT | fx-discovery routes, fx-shaping bd-artifact-service |
| `org_id` | `proj_*` 또는 `org-*` | foundry-x-db organizations | biz_items FK (끊기므로 app-level 검증 필요) |

#### D3 — Breaking Change 영향도

biz_items 이동 시 영향 파일:
- `packages/api/src/core/discovery/` — biz_items 쿼리
- `packages/fx-discovery/src/` — biz_items service
- `packages/fx-shaping/src/services/bd-artifact-service.ts` — biz_items READ (Service Binding 경유)

**이번 Sprint 범위**: 신규 DB 생성 + Shadow Write 검증 스크립트 + 롤백 리허설만.
실제 마이그레이션(biz_items 행 이동)은 F561 완료 = PoC 단계로 한정.

### 2.5 마이그레이션 재번호 전략

`packages/fx-discovery/migrations/` 신규 폴더에 복사 시 번호 재할당:
```
원본 번호 → fx-discovery 번호
0033 → 0001_biz_items.sql
0034 → 0002_biz_evaluations.sql
0035 → 0003_biz_starting_points.sql
0036 → 0004_discovery_criteria.sql
0039 → 0005_biz_item_trend_reports.sql
0058 → 0006_discovery_type_enum.sql
0077 → 0007_biz_item_discovery_stages.sql
0090 → 0008_discovery_pipeline.sql
0098 → 0009_discovery_reports.sql
0100 → 0010_discovery_reports_v2.sql
0123 → 0011_fix_discovery_reports_schema.sql
0127 → 0012_discovery_worker_comment.sql
0128 → 0013_backlog_items.sql (discovery 소유 여부 재확인 필요)
```

원본 `packages/api/src/db/migrations/` 파일은 **삭제하지 않음** (중복 유지, 이번 Sprint 범위).

### 2.6 수정 파일 매핑 (F561)

| 파일 | 변경 유형 | 설명 |
|------|---------|------|
| `packages/fx-discovery/wrangler.toml` | 수정 | `database_id` 교체 (신규 D1 ID) |
| `packages/fx-discovery/migrations/` | 신규 폴더 | Discovery 전용 migration 복사본 |
| `scripts/f561-shadow-write-verify.sh` | 신규 | Shadow Write 검증 스크립트 |
| `scripts/f561-rollback-rehearsal.sh` | 신규 | 롤백 리허설 스크립트 |
| `docs/02-design/features/sprint-313-f561-fk-analysis.md` | 신규 | FK 분석 + 재번호 전략 문서 |

**신규 D1 생성**: Cloudflare MCP 또는 wrangler CLI 사용
**실측 database_id**: 생성 후 wrangler.toml에 기록

---

## §3 F562 — shared-contracts 신설

### 3.1 패키지 구조 (확정)

```
packages/shared-contracts/
├── package.json
├── tsconfig.json
├── DESIGN.md
└── src/
    ├── index.ts
    ├── discovery.ts      (Discovery 도메인 public API 계약)
    ├── shaping.ts        (Shaping 도메인 계약)
    ├── events.ts         (DomainEvent 카탈로그)
    └── ax-bd.ts          (AX BD 공용 비즈니스 타입)
```

### 3.2 이동 대상 타입 (D1 체크리스트 — 주입 사이트 전수)

#### discovery.ts 이동 대상 (`shared/src/discovery-contract.ts` → )

| 인터페이스 | 현재 위치 | 소비자 |
|-----------|---------|-------|
| `ExecuteSkillInput` | `shared/src/discovery-contract.ts` | `fx-shaping/bd-skill-executor.ts` |
| `ArtifactListQuery` | `shared/src/discovery-contract.ts` | `fx-shaping/bd-artifact-service.ts` |
| `BdArtifact` | `shared/src/discovery-contract.ts` | `fx-shaping/bd-artifact-service.ts` |
| `SkillExecutionResult` | `shared/src/discovery-contract.ts` | `fx-shaping/bd-skill-executor.ts` |
| `TriggerShapingInput` | `shared/src/discovery-contract.ts` | `fx-shaping/shaping-orchestrator-service.ts` |

#### discovery.ts 추가 이동 (`shared/src/discovery-v2.ts` 등에서)
| 인터페이스 | 현재 위치 | 소비자 |
|-----------|---------|-------|
| `DiscoveryIngestPayload` | `shared/src` | `fx-shaping/discovery-x-ingest.service.ts` |
| `DiscoveryStatus` | `shared/src` | `fx-shaping/discovery-x-ingest.service.ts` |
| `DiscoveryReportResponse` | `shared/src` | `fx-discovery/discovery-report-service.ts` |
| `ExecutiveSummaryData` | `shared/src` | `fx-discovery/discovery-report-service.ts` |

#### ax-bd.ts 이동 대상 (`shared/src/ax-bd.ts` cross-domain 타입)
- `BmcBlock`, `BmcBlockType`, `Bmc`, `Idea`, `IdeaBmcLink` 등 cross-domain 공유 타입

#### events.ts 이동 대상 (`shared/src/events/catalog.ts`)
- `DomainEventEnvelope`, `DomainEventType`, 8종 이벤트 payload 타입

### 3.3 D2 — 식별자 계약 (shared-contracts)

shared-contracts는 타입만 — ID 포맷 계약은 JSDoc으로 명시:
```typescript
/** @format hex(randomblob(16)) lowercase — 생산자: foundry-x-db biz_items INSERT */
bizItemId: string;

/** @format ISO 8601 UTC — 생산자: datetime('now') D1 */
createdAt: string;
```

### 3.4 호환성 유지 전략

`shared/src/discovery-contract.ts`에 re-export 추가 (breaking change 방지):
```typescript
// shared/src/discovery-contract.ts — F562 이후 re-export 브리지
export type { ExecuteSkillInput, BdArtifact, ... } from '@foundry-x/shared-contracts';
```
소비자(fx-shaping 등) import 경로 수정 없이 동작 유지.

### 3.5 수정 파일 매핑 (F562)

| 파일 | 변경 유형 | 설명 |
|------|---------|------|
| `packages/shared-contracts/package.json` | 신규 | workspace 패키지 설정 |
| `packages/shared-contracts/tsconfig.json` | 신규 | TypeScript 설정 |
| `packages/shared-contracts/DESIGN.md` | 신규 | 설계 가이드라인 (구현 금지 원칙) |
| `packages/shared-contracts/src/index.ts` | 신규 | re-export 진입점 |
| `packages/shared-contracts/src/discovery.ts` | 신규 | Discovery 계약 타입 |
| `packages/shared-contracts/src/shaping.ts` | 신규 | Shaping 계약 타입 |
| `packages/shared-contracts/src/events.ts` | 신규 | DomainEvent 카탈로그 |
| `packages/shared-contracts/src/ax-bd.ts` | 신규 | AX BD 공용 타입 |
| `pnpm-workspace.yaml` | 수정 | `packages/shared-contracts` 추가 |
| `packages/shared/src/discovery-contract.ts` | 수정 | re-export 브리지 추가 |

---

## §4 Stage 3 Exit 체크리스트

| # | 항목 | 결과 |
|---|------|------|
| D1 | 주입 사이트 전수 검증 | F561: Shadow Write는 write() 단일 주입점. F562: 소비자 전수 목록 §3.2에 명시 ✅ |
| D2 | 식별자 계약 | F561: biz_items.id 포맷 + org_id 끊김 처리 §2.4 명시. F562: JSDoc 계약 §3.3 ✅ |
| D3 | Breaking change 영향도 | F561: biz_items 영향 파일 3개 §2.4 명시. F562: re-export 브리지로 zero breaking ✅ |
| D4 | TDD Red 파일 존재 | F561: D1 생성은 인프라(면제). F562: 타입 전용 패키지(면제) — typecheck가 검증 대체 ✅ |

**TDD 면제 근거**: F561은 D1 migration(TDD 면제 항목), F562는 타입+스키마만(구현 로직 없음) → vitest 대신 `tsc --noEmit`으로 검증.

---

## §5 Worker 파일 매핑 (구현 단계 상세)

### F561 구현 순서
1. **Cloudflare D1 생성** — MCP `d1_database_create` 또는 wrangler
2. **wrangler.toml 교체** — `packages/fx-discovery/wrangler.toml` database_id 업데이트
3. **fx-discovery/migrations/ 폴더** — 13개 SQL 복사 + 재번호
4. **Shadow Write 스크립트** — `scripts/f561-shadow-write-verify.sh`
5. **롤백 리허설 스크립트** — `scripts/f561-rollback-rehearsal.sh`
6. **FK 분석 문서** — `docs/02-design/features/sprint-313-f561-fk-analysis.md`

### F562 구현 순서
1. **패키지 scaffold** — package.json + tsconfig.json + DESIGN.md
2. **타입 파일 작성** — discovery.ts, shaping.ts, events.ts, ax-bd.ts
3. **index.ts** — re-export 진입점
4. **pnpm-workspace.yaml 추가**
5. **re-export 브리지** — shared/src/discovery-contract.ts 수정
6. **typecheck PASS 확인**

---

## §6 Phase Exit 조건 (P1~P4)

| # | 항목 | 검증 방법 |
|---|------|--------|
| P1 | Dogfood 실행 1회 | F561: Shadow Write 스크립트 실행 로그, F562: typecheck + pnpm install 정상 |
| P2 | 실측 산출물 | F561: 신규 D1에 테스트 row 1건 이상 write 성공 로그, F562: `@foundry-x/shared-contracts` import 정상 |
| P3 | KPI 실측 | F561: 롤백 후 기존 API 응답 정상(200), F562: typecheck error 0건 |
| P4 | 회고 | FK 끊김 목록 + 재번호 전략 문서가 Phase Exit 증거 |
