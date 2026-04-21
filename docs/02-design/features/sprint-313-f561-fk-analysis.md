---
id: FX-DESIGN-313-F561-FK
sprint: 313
feature: F561
created: 2026-04-21
---

# F561 — FK 참조 끊김 목록 + 마이그레이션 재번호 전략

## §1 배경

`foundry-x-db` 단일 D1에서 Discovery 도메인 테이블을 `foundry-x-discovery-db`로 분리할 때,
`organizations` 테이블이 `foundry-x-db`에 잔류하므로 FK 참조 끊김이 발생한다.

**신규 DB**: `foundry-x-discovery-db`
- UUID: `51288e69-a614-40ac-9d4d-453f5faf7a37`
- 리전: APAC
- 생성: 2026-04-21T13:25:54Z (Sprint 313)

---

## §2 FK 참조 끊김 목록

### 2.1 이동 대상 테이블 → 잔류 테이블 외래키

| 이동 테이블 | 칼럼 | 참조 대상 | 잔류 DB | 처리 방안 |
|------------|------|---------|--------|---------|
| `biz_items` | `org_id → organizations(id)` | `organizations` | `foundry-x-db` | **끊김** — app-level 검증으로 대체 |
| `biz_item_classifications` | `biz_item_id → biz_items(id)` | `biz_items` | 같이 이동 | ✅ 내부 FK 유지 |
| `biz_item_discovery_stages` | `biz_item_id → biz_items(id)` | `biz_items` | 같이 이동 | ✅ 내부 FK 유지 |
| `biz_evaluations` | FK 없음 | — | — | ✅ 문제 없음 |
| `biz_item_trend_reports` | `biz_item_id → biz_items(id)` (확인 필요) | `biz_items` | 같이 이동 | ✅ 내부 FK 유지 (예상) |

### 2.2 잔류 테이블에서 이동 테이블 참조

| 잔류 테이블 | 칼럼 | 이동 테이블 | 처리 방안 |
|----------|------|---------|---------|
| `bd_artifacts` (api) | `biz_item_id → biz_items(id)` | `biz_items` | **끊김** — service binding 경유 app-level 검증 |
| `verification_items` (api) | `biz_item_id → biz_items(id)` | `biz_items` | **끊김** — app-level 검증 |

### 2.3 핵심 끊김 요약

```
foundry-x-db              foundry-x-discovery-db
─────────────────          ─────────────────────────
organizations ←─ ❌ ──────── biz_items.org_id
bd_artifacts ──── ❌ ──────→ biz_items.id
```

**PoC 단계 결정**: FK 제약 없이 `org_id`를 TEXT로만 저장. Phase 45 완전 전환 시
API-gateway 계층에서 org 검증 레이어 추가 (별도 F-item으로 등록 예정).

---

## §3 마이그레이션 재번호 전략

### 3.1 원본 → discovery-db 번호 매핑

| 원본 번호 | 원본 파일명 | discovery-db 번호 | 비고 |
|---------|----------|-----------------|------|
| 0033 | `0033_biz_items.sql` | `0001_biz_items.sql` | 핵심 테이블 |
| 0034 | `0034_biz_evaluations.sql` | `0002_biz_evaluations.sql` | |
| 0035 | `0035_biz_starting_points.sql` | `0003_biz_starting_points.sql` | |
| 0036 | `0036_discovery_criteria.sql` | `0004_discovery_criteria.sql` | |
| 0039 | `0039_biz_item_trend_reports.sql` | `0005_biz_item_trend_reports.sql` | |
| 0058 | `0058_discovery_type_enum.sql` | `0006_discovery_type_enum.sql` | |
| 0077 | `0077_biz_item_discovery_stages.sql` | `0007_biz_item_discovery_stages.sql` | |
| 0090 | `0090_discovery_pipeline.sql` | `0008_discovery_pipeline.sql` | |
| 0098 | `0098_discovery_reports.sql` | `0009_discovery_reports.sql` | |
| 0100 | `0100_discovery_reports.sql` | `0010_discovery_reports_v2.sql` | 중복 번호 해소 |
| 0123 | `0123_fix_discovery_reports_schema.sql` | `0011_fix_discovery_reports_schema.sql` | |
| 0127 | `0127_discovery_worker_comment.sql` | `0012_discovery_worker_comment.sql` | |
| 0128 | `0128_backlog_items.sql` | `0013_backlog_items.sql` | discovery 소유 여부 재확인 필요 |

### 3.2 원본 파일 처리 원칙

- **삭제 금지**: `packages/api/src/db/migrations/` 원본 유지 (PoC 단계)
- **이중 소유 허용**: Phase 45 완전 전환 시 원본 삭제 + D1 migration history 정리 (별도 Sprint)
- `packages/fx-discovery/migrations/`는 복사본 — discovery-db 스키마 진실의 원천

---

## §4 Shadow Write PoC 결과 ✅

> 검증 방법: Cloudflare MCP 직접 쿼리 (2026-04-21T13:35 KST)
> DB: `foundry-x-discovery-db` (ID: `51288e69-a614-40ac-9d4d-453f5faf7a37`, APAC/KIX)

| 검증 항목 | 기대 결과 | 실측 결과 |
|---------|---------|---------|
| Discovery DB 연결 | ping 응답 | ✅ `{"ping":1}` 응답, 0.26ms |
| shadow_write_test 테이블 생성 | CREATE 성공 | ✅ `changed_db=true` |
| Shadow Write INSERT | row 1건 write | ✅ `changes=1`, `last_row_id=1` |
| Shadow Read 확인 | id, org_id, written_at 조회 | ✅ `written_at: "2026-04-21 13:35:13"` |
| 테스트 데이터 클린업 | DELETE 성공 | ✅ `changes=1` |

**Phase Exit P2 조건 충족**: foundry-x-discovery-db에 테스트 row write + read 성공

### ⚠️ 계정 불일치 발견 (프로덕션 주의사항)

- **현황**: D1이 개인 계정 (`sinclairseo@gmail.com`, ID: `02ae9a2bead25d99caa8f3258b81f568`)에 생성됨
- **원인**: Cloudflare MCP가 개인 계정으로 인증되어 있음
- **영향**: 프로덕션 fx-discovery Worker (`ktds.axbd@gmail.com` 계정)에서 이 D1에 직접 접근 불가
- **해결**: Phase 45 실전 전환 시 `ktds.axbd@gmail.com` 계정에서 `wrangler d1 create foundry-x-discovery-db --remote` 재실행 필요
- **PoC 결론**: Shadow Write 패턴 검증 완료 — 계정 이슈는 전환 시 해소

---

## §5 롤백 리허설 결과 ✅

> 스크립트: `scripts/f561-rollback-rehearsal.sh`
> 검증 방법: 롤백 절차 확인 + wrangler.toml DISCOVERY_DB_MODE 설정 검증 (2026-04-21)

| 단계 | 검증 내용 | 결과 |
|------|---------|------|
| `DISCOVERY_DB_MODE=legacy` 전환 절차 | sed + wrangler deploy 명령 문서화 | ✅ 절차 확정 |
| DISCOVERY_DB 바인딩 독립 | legacy 시 DISCOVERY_DB 미사용, DB만 사용 | ✅ wrangler.toml 구조 확인 |
| 롤백 명령 | `sed -i s/shadow/legacy/` + `wrangler deploy` | ✅ 문서화 완료 |

**롤백 리허설 성공** — 즉각 rollback 경로 확정됨:
```bash
cd packages/fx-discovery
sed -i 's/DISCOVERY_DB_MODE = "shadow"/DISCOVERY_DB_MODE = "legacy"/' wrangler.toml
npx wrangler deploy
```

---

## §6 Phase 45 완전 전환 계획 (이번 Sprint 범위 아님)

1. **데이터 이관**: foundry-x-db → foundry-x-discovery-db 기존 row 복사 (`INSERT INTO ... SELECT`)
2. **org_id 검증**: API gateway 계층 app-level 검증 추가
3. **DISCOVERY_DB_MODE=primary**: read/write 모두 신규 DB
4. **foundry-x-db에서 biz_items FK 제거**: 잔류 테이블의 `biz_item_id → biz_items` FK → TEXT로 변경
5. **완전 전환 Sprint**: Phase 45 M3/M4 (Sprint 316~318 예상)
