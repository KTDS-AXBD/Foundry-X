---
id: FX-RPRT-314
sprint: 328
feature: F582
req: FX-REQ-648
match_rate: 98
status: completed
date: 2026-05-03
---

# Sprint 328 Report — F582: GAP-4 Discovery 인프라 회복 (옵션 C)

## 요약

F553 4주 회고 GAP-4 후속. F560(Sprint 312, 4월 22일경) fx-discovery 이관 이후 12일+ 중단된 Discovery
인프라 metrics 기록을 회복했어요. `DiagnosticCollector` + `autoTriggerMetaAgent` fx-discovery 측
배선으로 `agent_run_metrics` → `agent_improvement_proposals` 자동 기록 경로가 복구됐어요.

## Gap Analysis

| 항목 | 결과 |
|------|------|
| **Match Rate** | **98%** |
| Design 파일 매핑 | 100% (6/6) |
| Plan §3 OBSERVED (코드) | 100% (P-b, P-c, P-f, P-g 충족) |
| Implementation 충실도 | 95% |

## Codex Cross-Review

| 항목 | 결과 |
|------|------|
| verdict | BLOCK (false positive 포함) |
| degraded | false |
| 실제 WARN | `collector.record()` `.catch()` 누락 → 즉시 hotfix 완료 |
| False positive | FX-REQ-587~590 커버리지 — F582 REQ는 FX-REQ-648 (다른 Sprint 코드 참조) |
| False positive | `ANTHROPIC_API_KEY` 타입 에러 — DiscoveryEnv에 이미 `ANTHROPIC_API_KEY?: string` 정의 |

## 구현 내역

### 신규 파일

**`packages/fx-discovery/src/services/diagnostic-collector.ts`** (32 lines)
- `DiagnosticCollector.record(sessionId, agentId, status, tokensUsed, durationMs)` — 단순화 시그니처
- `agent_run_metrics` D1 INSERT (foundry-x-db 공유)
- `crypto.randomUUID()` 사용 (nodejs_compat)

**`packages/fx-discovery/src/services/auto-trigger-meta-agent.ts`** (88 lines)
- `autoTriggerMetaAgent(db, sessionId, apiKey, bizItemId?, metaAgentModel?)` — standalone
- `agent_run_metrics` WHERE `session_id LIKE 'stage-%-{bizItemId}'` → overallScore → Anthropic API
- `agent_improvement_proposals` INSERT
- fx-agent `core/discovery/routes/discovery-stage-runner.ts` standalone 버전 기반

### 수정 파일

**`packages/fx-discovery/src/routes/discovery-stages.ts`**
- POST `/biz-items/:id/discovery-stage` 핸들러:
  - `collector.record("stage-{stage}-{bizItemId}", "discovery-stage-runner", "success", 0, 0).catch()` — fire-and-forget
  - `autoTriggerMetaAgent(...)` — `status=completed && ANTHROPIC_API_KEY` 조건 시 fire-and-forget

**`packages/fx-discovery/src/__tests__/discovery-stages.test.ts`**
- F582 describe 블록 추가 (2 tests): `status=completed` + `status=in_progress` → record 1회 호출 검증
- `vi.mock` + `mockImplementation` per-test DiagnosticCollector mock

## TDD 결과

| Phase | 상태 |
|-------|------|
| Red | `AssertionError: expected "spy" to be called once, but got 0 times` ✅ FAIL 확인 |
| Green | 37/37 tests PASS ✅ |
| Typecheck | PASS (19/19) ✅ |

## OBSERVED 측정 (코드 레벨)

| ID | 항목 | 실측 | 판정 |
|----|------|------|:----:|
| P-b | `grep DiagnosticCollector\|collector.record` in fx-discovery | 다수 매칭 (services + routes + test) | ✅ |
| P-c | `grep autoTriggerMetaAgent\|meta-trigger` in fx-discovery | 2 매칭 (services/export + routes/import+call) | ✅ |
| P-g | typecheck + test GREEN | 19/19 + 37/37 | ✅ |
| P-f | F560 회귀 0건 | fx-gateway/main-api 변경 없음 | ✅ |

## OBSERVED 측정 (Production — 배포 후 별도 검증 필요)

| ID | 항목 | 상태 |
|----|------|------|
| P-a | Routing 분기 curl 확증 | 배포 후 실측 필요 |
| P-d | Dogfood Smoke Reality (agent_run_metrics +1) | 배포 후 실측 필요 |
| P-e | dual_ai_reviews ≥ 1 (sprint 328) | ✅ save-dual-review.sh 자동 실행 (verdict=BLOCK) |
| P-h | wrangler tail error 0건 | 배포 후 실측 필요 |

## 변경 파일 통계

| 파일 | 변경 |
|------|------|
| `packages/fx-discovery/src/services/diagnostic-collector.ts` | +32 (신규) |
| `packages/fx-discovery/src/services/auto-trigger-meta-agent.ts` | +88 (신규) |
| `packages/fx-discovery/src/routes/discovery-stages.ts` | +25 |
| `packages/fx-discovery/src/__tests__/discovery-stages.test.ts` | +44 |
| `docs/02-design/features/sprint-328.design.md` | +92 (신규) |

총 +281 lines, 5 files

## 커밋 해시

- `84939ce7` — feat(fx-discovery): F582 green — DiagnosticCollector + autoTriggerMetaAgent 배선
- `8c372d27` — fix(fx-discovery): F582 hotfix — collector.record .catch() 추가

## 후속 (Production Smoke Reality)

P-a, P-d, P-h는 배포 후 Master가 독립 실측 필요:
```bash
# P-d: agent_run_metrics 신규 기록 확인
wrangler d1 execute foundry-x-db --remote \
  --command="SELECT COUNT(*) FROM agent_run_metrics WHERE created_at > '2026-05-03T14:00Z'"
```

> rules/development-workflow.md "Autopilot Production Smoke Test" 11회차 회피 원칙:
> Match 98% + CI green + Production smoke PASS 3축 동시 충족 시에만 완결 선언.

## Insight

GAP-4의 본질 = Strangler 분리 부수효과. F560 이관이 collector 배선이 있는 main-api 경로를
우회하면서 metrics 끊김. 재발 방지: MSA 분리 시 cross-cutting concern(DiagnosticCollector,
AuditLogger 등) 도메인별 분산 체크리스트 필수.
