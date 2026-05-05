---
id: FX-DSGN-345
sprint: 345
feature: F611
req: FX-REQ-675
status: approved
date: 2026-05-05
---

# Sprint 345 Design — F611: MSA 룰 강제 교정 Pass 4

## §1 목표

cross-domain-d1 30 위반 → 0. owner 도메인이 D1 API 함수를 service 계층에서 노출하고, caller는 직접 SQL 대신 함수 경유.

## §2 변경 전략

F609 re-export 패턴 재현:
1. owner 도메인에 `{domain}-d1-api.ts` 신규 파일 생성
2. `types.ts`에 re-export 추가
3. caller에서 import 경로 변경 + SQL 제거 → 함수 호출

## §3 신규 파일 (3개)

| 파일 | owner domain | 함수 수 | 해소 violations |
|------|-------------|---------|----------------|
| `core/agent/services/agent-d1-api.ts` | agent | 15 | 19건 |
| `core/discovery/services/discovery-d1-api.ts` | discovery | 6 | 6건 |
| `core/offering/services/offering-d1-api.ts` | offering | 5 | 5건 |

## §4 테스트 계약 (TDD Red Target)

면제 (D1 migration 없음, service 함수 단순 SQL 위임). typecheck + lint baseline check로 대체.

## §5 파일 매핑

### 신규 파일

| 파일 | 역할 |
|------|------|
| `packages/api/src/core/agent/services/agent-d1-api.ts` | agent 도메인 D1 API 함수 15종 |
| `packages/api/src/core/discovery/services/discovery-d1-api.ts` | discovery 도메인 D1 API 함수 6종 |
| `packages/api/src/core/offering/services/offering-d1-api.ts` | offering 도메인 D1 API 함수 5종 |

### 수정 파일

**re-export (types.ts 3개)**
| 파일 | 변경 |
|------|------|
| `packages/api/src/core/agent/types.ts` | agent-d1-api.ts re-export 추가 |
| `packages/api/src/core/discovery/types.ts` | discovery-d1-api.ts re-export 추가 |
| `packages/api/src/core/offering/types.ts` | offering-d1-api.ts re-export 추가 |

**caller (12개 파일, 30 violations)**
| 파일 | violations | target API |
|------|-----------|------------|
| `core/work/services/work.service.ts` | 6 | agent-d1-api |
| `core/harness/services/harness-rules.ts` | 3 | agent-d1-api |
| `core/harness/services/monitoring.ts` | 1 | agent-d1-api |
| `core/harness/services/auto-fix.ts` | 2 | agent-d1-api |
| `core/harness/services/worktree-manager.ts` | 2 | agent-d1-api |
| `core/harness/services/automation-quality-reporter.ts` | 4 | agent-d1-api |
| `core/decode-bridge/routes/index.ts` | 1 | agent-d1-api |
| `core/harness/services/backup-restore-service.ts` | 4 | discovery-d1-api |
| `core/agent/services/skill-pipeline-runner.ts` | 1 | discovery-d1-api |
| `core/shaping/services/shaping-orchestrator-service.ts` | 1 | discovery-d1-api |
| `core/discovery/services/discovery-shape-pipeline-service.ts` | 1 | offering-d1-api |
| `core/discovery/services/portfolio-service.ts` | 3 | offering-d1-api |
| `core/harness/services/prototype-service.ts` | 1 | offering-d1-api |

**baseline**
| 파일 | 변경 |
|------|------|
| `packages/api/.eslint-baseline.json` | 30 cross-domain-d1 fingerprint 제거 (57 → 27) |

## §6 Phase Exit

- P-a: 3 d1-api.ts 파일 신설
- P-b: types.ts +re-export 정확
- P-c: 30 caller 모두 함수 경유 (직접 SQL 0건)
- P-d: baseline 57 → 27
- P-e: baseline check exit 0
- P-f: typecheck GREEN
