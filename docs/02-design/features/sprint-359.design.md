---
code: FX-DSGN-359
title: Sprint 359 — F607 AI 투명성 + 윤리 임계 Design
version: 1.0
status: Active
category: DESIGN
created: 2026-05-06
updated: 2026-05-06
sprint: 359
f_item: F607
req: FX-REQ-671
---

# Sprint 359 — F607 AI 투명성 + 윤리 임계 Design

## §1 목표

`core/ethics/` 도메인 신설: confidence < 0.7 HITL 에스컬레이션 + FP 측정 + kill switch 3축 구현.

## §2 의존성

| 자산 | 위치 | 활용 |
|------|------|------|
| AuditBus | `core/infra/audit-bus.ts` | ethics 이벤트 3종 emit |
| D1 `audit_events` | migration 0140 | confidence + fp_flag ALTER ADD |
| `generateTraceId/generateSpanId` | `core/infra/audit-bus.ts` | TraceContext 생성 |

## §3 아키텍처

```
core/ethics/
├── types.ts                         — EthicsViolation, KillSwitchState, FPRateResult 타입
├── schemas/
│   └── ethics.ts                   — Zod schemas (CheckConfidence, RecordFP, KillSwitchToggle)
├── services/
│   └── ethics-enforcer.service.ts  — EthicsEnforcer class (5 methods)
├── routes/
│   └── index.ts                    — ethicsApp (4 endpoints)
└── ethics-enforcer.test.ts         — 3 unit tests
```

## §4 테스트 계약 (TDD Red Target)

| # | 테스트 | 입력 | 기대 |
|---|--------|------|------|
| T1 | confidence 0.6 → escalated | confidence=0.6 | passed=false, escalated=true + ethics_violations INSERT + auditBus.emit 호출 |
| T2 | recordFP → ethics_violations + audit | callId, reason | ethics_violations INSERT + auditBus.emit 호출 |
| T3 | triggerKillSwitch(active=true) | active=true | active=true 반환 + auditBus.emit 호출 |

## §5 파일 매핑 (Worker 단일)

| 파일 | 동작 |
|------|------|
| `packages/api/src/db/migrations/0144_ethics_audit.sql` | 신규 — D1 스키마 (ALTER + 2 테이블) |
| `packages/api/src/core/ethics/types.ts` | 신규 — 공유 타입 |
| `packages/api/src/core/ethics/schemas/ethics.ts` | 신규 — Zod 검증 스키마 |
| `packages/api/src/core/ethics/services/ethics-enforcer.service.ts` | 신규 — EthicsEnforcer 서비스 |
| `packages/api/src/core/ethics/routes/index.ts` | 신규 — 4 endpoints |
| `packages/api/src/core/ethics/ethics-enforcer.test.ts` | 신규 — 3 unit tests |
| `packages/api/src/app.ts` | 수정 — `app.route("/api/ethics", ethicsApp)` 추가 |

## §6 API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/ethics/check-confidence` | confidence 임계 검사 → HITL escalation |
| GET | `/api/ethics/violations` | 윤리 위반 이력 조회 (`?agent_id=&limit=`) |
| POST | `/api/ethics/kill-switch` | kill switch 토글 |
| GET | `/api/ethics/fp-stats` | FP 통계 (`?agent_id=&days=7`) |

## §7 D1 변경

### `audit_events` ALTER (migration 0144)
- `confidence REAL` — LLM 호출 신뢰도 (0~1)
- `fp_flag INTEGER DEFAULT 0` — 오분류 마킹

### 신규 테이블
- `ethics_violations` — append-only, 3가지 위반 유형
- `kill_switch_state` — org+agent별 1행, UPDATE 가능

## §8 Stage 3 Exit 체크리스트

| # | 항목 | 상태 |
|---|------|------|
| D1 | 주입 사이트 전수 검증 (AuditBus emit 3곳) | ✅ §3 파일 매핑 명시 |
| D2 | 식별자 계약 — org_id/agent_id 소비자 동일 | ✅ CHECK constraint 명시 |
| D3 | Breaking change 없음 — ALTER ADD만 | ✅ 기존 쿼리 영향 없음 |
| D4 | TDD Red 파일 위치 | `core/ethics/ethics-enforcer.test.ts` |
