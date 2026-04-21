---
id: FX-PLAN-313
sprint: 313
features: [F561, F562]
status: plan
created: 2026-04-21
---

# Sprint 313 Plan — F561 + F562 (Phase 45 MVP M2)

## 범위 확정 (SCOPE LOCKED)

| F-item | 제목 | REQ | 우선순위 |
|--------|------|-----|--------|
| F561 | D1 Option A 전환 PoC (discovery_db 분리) | FX-REQ-604 | P0 |
| F562 | shared-contracts 레이어 신설 | FX-REQ-605 | P1 |

**Out-of-scope**: F563(Sprint 314), F564(Sprint 315), offering/agent 도메인 변경 금지

---

## F561 — D1 discovery_db 분리 PoC

### 목표
`foundry-x-db` 단일 D1에서 Discovery 도메인 전용 `foundry-x-discovery-db`를 분리하는 첫 단계.
롤백 리허설 성공이 완료 조건. (리스크 R1 최고 수준)

### 요구사항 (5항목 전부 필수)
- (a) 신규 D1 `foundry-x-discovery-db` 생성 (Cloudflare API 또는 wrangler)
- (b) fx-discovery `wrangler.toml` `database_id` 교체
- (c) biz_items Blue-Green/Shadow Write 검증 스크립트
- (d) 롤백 리허설 1회 성공 (롤백 후 기존 DB 정상 동작 확인)
- (e) FK 참조 끊김 목록화 + 마이그레이션 재번호 전략 문서화

### Discovery 관련 Migration 목록 (이동 대상 후보)
현행 `packages/api/src/db/migrations/`에서 Discovery 도메인 소유 테이블:
```
0033_biz_items.sql              → biz_items, biz_item_classifications
0034_biz_evaluations.sql        → biz_evaluations
0035_biz_starting_points.sql    → biz_starting_points
0036_discovery_criteria.sql     → discovery_criteria
0039_biz_item_trend_reports.sql → biz_item_trend_reports
0058_discovery_type_enum.sql    → discovery_type 관련
0077_biz_item_discovery_stages.sql → biz_item_discovery_stages
0090_discovery_pipeline.sql     → discovery_pipeline
0098_discovery_reports.sql      → discovery_reports
0100_discovery_reports.sql      → discovery_reports (추가 열)
0123_fix_discovery_reports_schema.sql → fix
0127_discovery_worker_comment.sql → discovery_worker_comment
0128_backlog_items.sql          → backlog_items (discovery 소유 여부 확인 필요)
```
**FK 위험**: `biz_items.org_id → organizations(id)` — organizations는 foundry-x-db 잔류 → FK 끊김

### 구현 전략
1. **PoC 전용 격리**: `packages/fx-discovery/migrations/` 신규 폴더에 복사본 생성 (원본 삭제 안 함)
2. **Shadow Write**: 신규 DB에 write 시도, 실패 시 기존 DB로 fallback
3. **Blue-Green PoC**: 환경변수 `DISCOVERY_DB_MODE=shadow|primary` 플래그로 전환
4. **롤백 리허설**: `DISCOVERY_DB_MODE=legacy`로 즉시 복원

### 완료 조건
- [ ] `foundry-x-discovery-db` Cloudflare D1에 생성됨
- [ ] fx-discovery wrangler.toml 업데이트 (prod + dev 양쪽)
- [ ] Shadow Write 검증 스크립트 실행 PASS
- [ ] 롤백 리허설: `DISCOVERY_DB_MODE=legacy` 전환 후 기존 기능 정상 확인
- [ ] `docs/02-design/features/sprint-313-f561-fk-analysis.md` 작성

---

## F562 — shared-contracts 레이어 신설

### 목표
Discovery↔Shaping cross-domain 계약(DTO/Event)을 독립 패키지로 분리.
monolith 방지: 타입 + 스키마만, 구현 로직 일체 금지.

### 요구사항 (5항목 전부 필수)
- (a) `packages/shared-contracts/` 신규 pnpm workspace 패키지
- (b) Discovery↔Shaping Event/DTO v1.0 publish (타입 + Zod 스키마)
- (c) 구현 로직 완전 금지 (`function`, `class`, DB 접근 코드 없음)
- (d) `packages/shared-contracts/DESIGN.md` 설계 가이드라인
- (e) 기존 `shared/src/discovery-contract.ts`, `shared/src/ax-bd.ts` cross-domain 타입 이동

### 이동 대상 분석
| 파일 | 이동 대상 인터페이스 | 비고 |
|------|-------------------|------|
| `shared/src/discovery-contract.ts` | ExecuteSkillInput, BdArtifact, TriggerShapingInput 등 | Discovery↔Shaping 계약 |
| `shared/src/ax-bd.ts` | BmcBlock, Idea, IdeaBmcLink 등 | AX BD 도메인 간 공유 타입 |
| `shared/src/events/catalog.ts` | D1BusEvent 등 | 이벤트 카탈로그 |

### 패키지 구조
```
packages/shared-contracts/
├── package.json          (name: "@foundry-x/shared-contracts", version: "1.0.0")
├── tsconfig.json
├── DESIGN.md             (설계 가이드라인 — 타입만, 구현 금지)
└── src/
    ├── index.ts          (re-export)
    ├── discovery.ts      (Discovery 도메인 계약)
    ├── shaping.ts        (Shaping 도메인 계약)
    ├── events.ts         (도메인 간 이벤트 정의)
    └── ax-bd.ts          (AX BD 공용 타입)
```

### 완료 조건
- [ ] `packages/shared-contracts/` 패키지 생성 + pnpm-workspace.yaml 등록
- [ ] Discovery↔Shaping DTO/Event v1.0 타입 정의 완료
- [ ] `DESIGN.md` 설계 가이드라인 작성
- [ ] `shared/src/discovery-contract.ts` 타입 이동 + re-export 호환성 유지
- [ ] typecheck PASS

---

## 병렬 실행 계획

```
F561 (P0) ──────────────────────────────── (인프라 PoC)
  (a) D1 생성 → (b) wrangler 교체 → (c) Shadow Write → (d) 롤백 → (e) 문서화

F562 (P1) ──────────────────────────────── (타입 레이어)
  (a) 패키지 scaffold → (b) 타입 정의 → (c) 가이드 → (d) 이동 → typecheck
```

F561과 F562는 파일 충돌 없음 → 동시 착수 가능

---

## 리스크

| ID | 내용 | 대응 |
|----|------|------|
| R1 | D1 Shadow Write 실패 시 프로덕션 영향 | PoC 전용 격리 (prod 전환 없음), rollback 먼저 검증 |
| R3 | shared-contracts 도입 시 기존 import 경로 변경 | re-export 호환 레이어 유지 (breaking change 없음) |

---

## Sprint 313 체크리스트

- [ ] Plan 문서 (이 파일)
- [ ] Design 문서 (`sprint-313.design.md`)
- [ ] F561 구현 (D1 + Shadow Write + 롤백)
- [ ] F562 구현 (shared-contracts 패키지)
- [ ] typecheck PASS
- [ ] Gap Analysis ≥ 90%
- [ ] Phase Exit P1~P4 Smoke Reality
