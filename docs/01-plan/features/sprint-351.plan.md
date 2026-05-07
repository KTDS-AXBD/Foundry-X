---
code: FX-PLAN-351
title: Sprint 351 — F606 Audit Log Bus (T1 토대)
version: 1.1
status: SUPERSEDED
category: PLAN
created: 2026-05-06
updated: 2026-05-08
sprint: 351
f_item: F606
req: FX-REQ-670
priority: P2
---

# Sprint 351 — F606 Audit Log Bus (T1 토대)

> **STATUS: SUPERSEDED (S337, 2026-05-08)** — F606은 S335에서 코드화 완료(MEMORY entry "P0-7 F606 Audit Bus ✅"). audit-bus.ts + types.ts + D1 0140 + trace-context middleware + app.ts mount + 17 호출 사이트 + 9 tests 모두 정착. 본 plan §3 (a~h) 항목 모두 충족. **S337 hardening은 PR #766 (`c6cc48ac`)이 별도로 처리** — biz-items.ts:884 `?? ""` outlier가 14 sprint 연속 master deploy CI fail 유발 → empty key throw guard + 컨벤션 fallback 정합 + test-app + audit_events 테이블 시드 포함. 본 sprint 번호로 정식 WT가 시동된 적 없음. SPEC.md F606 row가 진실 — `Sprint 351 | ✅`.

> SPEC.md §5 F606 row가 권위 소스. 본 plan은 17 internal dev plan §3 T1 토대 첫 sprint로서 실행 절차 + Phase Exit 체크리스트.

## §1 배경 + 사전 측정

17 plan §3 Tier 1 토대 3건 중 첫 번째 — **모든 후속의 의존성 핵심**.

| 항목 | 현 상태 | 목표 |
|------|---------|------|
| trace_id chain | ❌ 부재 (모듈별 분산) | ✅ W3C Trace Context 표준 + middleware |
| HMAC 서명 | ❌ 부재 | ✅ SHA256 + 환경변수 키 |
| append-only audit | ❌ dual_ai_reviews + agent_run_metrics 분산 | ✅ 통합 audit_events 테이블 |
| SIEM 발행 | ❌ 미정의 | ⏳ 본 sprint는 토대만, 발행은 후속 (F619 Multi-Evidence) |
| 5 repo 발행자/수신자 | ❌ Foundry-X 단독 | ⏳ 본 sprint는 Foundry-X 자체 토대만 |

후속 의존:
- **F619** 4대 진단 Integration — Decode-X 이벤트 수신 (외부 의존 분리, 자체 stub은 가능)
- **F631** 분석X 자동화O — audit-bus event 발행
- **F607** AI 투명성 — confidence < 0.7 escalation event
- **F632** CQ 5축 — closure 검증 결과 audit 발행

## §2 인터뷰 4회 패턴 (S336, 30회차)

| 회차 | 결정 | 근거 |
|------|------|------|
| 1차 메인 결정 | T1 토대 첫 sprint = F606 Audit Log Bus | 모든 후속 의존성 핵심 |
| 2차 sub-app 형식 | `core/infra/audit-bus.ts` 평탄 (F596 cluster 합류) | A2 평탄 구조 일관성 (F596+F627 패턴 재현) |
| 3차 D1 migration | 0140_audit_bus.sql (audit_events + trace_links) | append-only 보장 (UPDATE 룰 차단) |
| 4차 시동 | 즉시 (Sprint 351) | autopilot ~15~25분 추정 |

## §3 범위 (a~h)

### (a) types.ts 갱신 (F596 + F627 cluster 확장)
```typescript
// packages/api/src/core/infra/types.ts (기존 + 신규)
export { SSEManager } from "./sse-manager.js";
export { KVCacheService } from "./kv-cache.js";
export { EventBus } from "./event-bus.js";
export { LLMService } from "./llm.js";
export { ServiceProxy } from "./service-proxy.js";
export { AuditBus } from "./audit-bus.js";              // NEW
export type { AuditEvent, TraceContext, EventEnvelope } from "./audit-bus.js"; // NEW
```

### (b) `core/infra/audit-bus.ts` 신설 (평탄 구조)
- `AuditBus` class — append-only D1 INSERT + HMAC SHA256 서명
- `TraceContext` interface — W3C Trace Context (`traceparent` header 표준)
- `AuditEvent` schema (zod) — { trace_id, span_id, event_type, timestamp, payload, hmac_signature }
- `EventEnvelope` — outbound SIEM 발행용 (현재 stub, F619에서 활성)

### (c) D1 migration `0140_audit_bus.sql`
```sql
CREATE TABLE audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id TEXT NOT NULL,
  span_id TEXT NOT NULL,
  parent_span_id TEXT,
  event_type TEXT NOT NULL,        -- "agent.run", "diagnostic.completed", "policy.evaluated", ...
  timestamp INTEGER NOT NULL,       -- unix epoch ms
  tenant_id TEXT,                   -- F601 multi-tenant 후속 연결 위치
  actor TEXT,                       -- user_id 또는 system actor
  payload TEXT NOT NULL,            -- JSON
  hmac_signature TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX idx_audit_events_trace ON audit_events(trace_id);
CREATE INDEX idx_audit_events_type_ts ON audit_events(event_type, timestamp);
CREATE INDEX idx_audit_events_tenant ON audit_events(tenant_id) WHERE tenant_id IS NOT NULL;

-- append-only 보장 (UPDATE/DELETE 차단)
CREATE TRIGGER audit_events_no_update BEFORE UPDATE ON audit_events
BEGIN
  SELECT RAISE(FAIL, 'audit_events is append-only');
END;

CREATE TRIGGER audit_events_no_delete BEFORE DELETE ON audit_events
BEGIN
  SELECT RAISE(FAIL, 'audit_events is append-only');
END;

CREATE TABLE trace_links (
  parent_trace_id TEXT NOT NULL,
  child_trace_id TEXT NOT NULL,
  link_type TEXT NOT NULL,          -- "follow_from", "child_of"
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  PRIMARY KEY (parent_trace_id, child_trace_id)
);
```

### (d) middleware `core/infra/middleware/trace-context.middleware.ts`
- 모든 incoming request에 W3C `traceparent` header 검사
- 부재 시 신규 trace_id + span_id 발급 (ULID 기반)
- 응답 header에 `trace_id` echo
- Hono context에 `c.set("traceContext", ...)` 주입

### (e) app.ts 통합
```typescript
import { traceContextMiddleware } from "./core/infra/middleware/trace-context.middleware.js";
// 가장 outer middleware로 등록 (모든 route 적용)
app.use("*", traceContextMiddleware);
```

### (f) 기존 로깅 통합 명세 (점진 마이그레이션 — 본 sprint는 명세만)
- `dual_ai_reviews` INSERT 직전에 `auditBus.emit("dual_ai_review.completed", ...)` 호출 (선택, breaking change 회피)
- `agent_run_metrics` 동일 패턴
- 이중 기록 허용 (점진 전환), 후속 sprint에서 단일화

### (g) typecheck + vitest GREEN
회귀 0 확증.

### (h) Phase Exit P-a~P-l 12항 (§4)

## §4 Phase Exit 체크리스트

| ID | 항목 | 측정 방법 | 기준 |
|----|------|----------|------|
| P-a | core/infra/audit-bus.ts + types.ts 갱신 | `find packages/api/src/core/infra` | 파일 존재 |
| P-b | D1 migration 적용 OK + audit_events 테이블 | `wrangler d1 execute foundry-x-db --command "SELECT name FROM sqlite_master WHERE name='audit_events'"` | 1 row |
| P-c | trace-context middleware 활성화 | `grep "traceContextMiddleware" packages/api/src/app.ts` | 등록 라인 1 |
| P-d | HMAC 서명 검증 통과 | unit test 1건 | PASS |
| P-e | typecheck + tests GREEN | `pnpm -F api typecheck && pnpm -F api test` | 회귀 0 |
| P-f | dual_ai_reviews sprint 351 자동 INSERT | D1 query | ≥ 1건 (hook 26 sprint 연속, 누적 ≥ 37건) |
| P-g | F614/F627 baseline=0 회귀 | `bash scripts/lint-baseline-check.sh` | exit 0 |
| P-h | F587~F627 회귀 측정 12항 | grep + count | 모든 항목 회귀 0 |
| P-i | Match ≥ 90% | gap-detector | semantic 100% 목표 |
| P-j | dist orphan = 0 | dist 빌드 후 잔존 검사 | 신규 파일이라 N/A |
| P-k | MSA cross-domain baseline=0 유지 | `bash scripts/lint-baseline-check.sh` | 0 |
| P-l | API smoke — trace_id header echo | `curl -i http://localhost:8787/api/health` 응답 header에 `trace_id` 또는 `traceparent` | 존재 |

## §5 전제

- F627 ✅ (Sprint 350, core/infra/ cluster 6 files 정착)
- F596 ✅ (Sprint 348, core/infra/ 신설)
- C103+C104 ✅ (25 sprint 연속 정상)
- D1 migration 0140부터 순차 발급 (0139 직후)

## §6 예상 시간

- autopilot **~15~25분** (D1 migration + middleware + types contract + audit-bus engine 신설)
- T1 토대 작업이라 비교적 큰 분량 (이전 closure 5분 평균보다 2~3배)

## §7 다음 사이클 후보

- **Sprint 352 — F628** BeSir 7-타입 Entity 모델 (T1 토대 두 번째)
- **Sprint 353 — F629** 5-Asset Model 확장 (T1 토대 세 번째)
- Sprint 354~ — T2 Domain Extraction (F630/F631/F624)
