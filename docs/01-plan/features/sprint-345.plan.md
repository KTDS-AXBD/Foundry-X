---
id: FX-PLAN-345
sprint: 345
feature: F611
req: FX-REQ-675
status: approved
date: 2026-05-05
depends_on: F608 (baseline JSON), F609 (types.ts re-export 패턴), F610 (single-file 자동화 검증)
---

# Sprint 345 Plan — F611: MSA 룰 강제 교정 Pass 4 — cross-domain-d1 30 violations service API 신설

## 목표

**F610 (Sprint 344) MERGED 후속.** D1 cross-domain 테이블 직접 접근 30건을 owner 도메인의 service API 신설로 해소. eslint-disable 우회 없이 진정한 도메인 경계 보호.

**핵심 원칙**:
- **Owner 도메인이 service API 정의**: agent / discovery / offering 도메인이 자신의 D1 테이블 read API를 service 계층에서 노출
- **Caller는 service 경유**: work / harness / shaping / decode-bridge / agent의 cross-domain caller가 직접 SQL 대신 service 메소드 호출
- **types.ts re-export로 캐스케이드**: F609 패턴 재현 — service class 추가 export

## 사전 측정 (S333, 2026-05-05)

### caller → target table 매트릭스 (실측 30건)

| caller domain | target table | viol | files |
|---------------|--------------|------|-------|
| **work** | agent_sessions | 5 | work.service.ts (L339,354,396,418,423,431) |
| **harness** | agent_tasks | 3 | auto-fix.ts L174, harness-rules.ts L122, monitoring.ts L118 |
| **harness** | agent_sessions | 1 | harness-rules.ts L62 |
| **harness** | agent_messages | 1 | auto-fix.ts L133 |
| **harness** | agent_worktrees | 2 | worktree-manager.ts L58,L89 |
| **harness** | agent_improvement_proposals | 0 | (decode-bridge에 위임됨) |
| **harness** | agent_* (others) | 4 | skill-pipeline-runner.ts L121, automation-quality-reporter.ts L318/L334, harness-rules.ts L55 (정확한 table은 caller 코드 인라인 확인) |
| **harness** | discovery_pipeline_runs | 2 | backup-restore-service.ts L88,L118 |
| **harness** | offering_id | 1 | prototype-service.ts L190 |
| **harness** | (others) | 2 | backup-restore-service.ts L125,L135 |
| **discovery** | offering_sections | 2 | discovery-shape-pipeline-service.ts L200, portfolio-service.ts L272 |
| **discovery** | offering_versions | 1 | portfolio-service.ts L276 |
| **discovery** | offering_id | 1 | portfolio-service.ts L333 |
| **shaping** | discovery_pipeline_runs | 1 | shaping-orchestrator-service.ts L64 |
| **agent** | discovery_pipeline_runs | 1 | skill-pipeline-runner.ts L121 |
| **decode-bridge** | agent_improvement_proposals | 1 | routes/index.ts L72 |

### Owner-domain별 신설할 service API

**core/agent/services/agent-d1-api.ts (신규)** — 외부 caller가 사용할 read API:
- `queryAgentSessions(env, filter?)` → `Array<AgentSession>` (work 5 + harness 1 사용)
- `queryAgentTasks(env, filter?)` → `Array<AgentTask>` (harness 3 사용)
- `getAgentMessages(env, sessionId, ...)` → `Array<AgentMessage>` (harness 1)
- `queryAgentWorktrees(env, filter?)` → `Array<AgentWorktree>` (harness 2)
- `queryAgentProposals(env, filter?)` → `Array<AgentImprovementProposal>` (decode-bridge 1)
- `queryAgentByName(env, name)` 또는 기타 정밀 쿼리 (skill-pipeline-runner 1, harness 추가 1)

**core/discovery/services/discovery-d1-api.ts (신규)**:
- `queryPipelineRuns(env, filter?)` → `Array<DiscoveryPipelineRun>` (harness 2 + shaping 1 + agent 1 사용 = 4)

**core/offering/services/offering-d1-api.ts (신규)**:
- `queryOfferingSections(env, filter?)` → `Array<OfferingSection>` (discovery 2)
- `queryOfferingVersions(env, filter?)` → `Array<OfferingVersion>` (discovery 1)
- `queryOfferingByItemId(env, bizItemId)` → `Offering | null` (discovery 1, harness 1 = 2)

### types.ts re-export 추가

- `core/agent/types.ts` +6 export (AgentD1Api 또는 함수 직접)
- `core/discovery/types.ts` +1 export (DiscoveryD1Api / queryPipelineRuns)
- `core/offering/types.ts` +3 export (OfferingD1Api / 3 함수)

## 인터뷰 패턴 (S333, 30회차)

| # | 질문 | 사용자 답변 |
|---|------|-------------|
| 1 | F611 cross-domain-d1 해소 전략 | **옵션 A 채택** — service API 신설 (recommended) |

## 범위

### (a) 3 owner-domain D1 service API 신설

- `core/agent/services/agent-d1-api.ts` — 6 함수 (queryAgentSessions/queryAgentTasks/getAgentMessages/queryAgentWorktrees/queryAgentProposals/auxiliary)
- `core/discovery/services/discovery-d1-api.ts` — 1 함수 (queryPipelineRuns)
- `core/offering/services/offering-d1-api.ts` — 3 함수 (queryOfferingSections/queryOfferingVersions/queryOfferingByItemId)

### (b) types.ts re-export

- agent/discovery/offering types.ts에 신규 service 함수/class re-export

### (c) 30 caller 변경

- work.service.ts 5 caller — `env.DB.prepare(...).all()` → `await queryAgentSessions(env, ...)`
- harness 16 caller — auto-fix / harness-rules / monitoring / worktree-manager / automation-quality-reporter / backup-restore / prototype-service / skill-pipeline-runner
- discovery 4 caller — discovery-shape-pipeline-service / portfolio-service
- shaping 1 caller — shaping-orchestrator-service
- agent 1 caller — skill-pipeline-runner
- decode-bridge 1 caller — routes/index

각 caller는 동일 SQL 의도를 service 함수로 대체. SQL은 owner 도메인에 봉인.

### (d) baseline JSON 갱신

`.eslint-baseline.json` 30 cross-domain-d1 fingerprint 제거. 현재 57 → 27.

### (e) typecheck + tests GREEN

신규 service 함수의 타입 정확성 + caller 변경 회귀 0건.

## Phase Exit P-a~P-j

- **P-a**: 3 d1-api.ts 파일 신설 (agent/discovery/offering)
- **P-b**: types.ts +10 service export 정확
- **P-c**: 30 caller 모두 service 경유 변경 (직접 SQL 0건)
- **P-d**: baseline 57 → 27 (정확 -30)
- **P-e**: baseline check exit 0
- **P-f**: typecheck + tests 회귀 0건
- **P-g**: dual_ai_reviews sprint 345 ≥ 1건 (hook 20 sprint 연속)
- **P-h**: F608/F609/F610 회귀 0
- **P-i**: API endpoints 동작 회귀 0 (F510 work/agent_sessions 라우트 정상)
- **P-j**: Match ≥ 90%

## 전제

- F608/F609/F610 ✅ MERGED
- C103+C104 ✅
- types.ts re-export 패턴 정착 (F609 12 도메인 + F610 24 symbol 추가)

## Out-of-scope

- multi-domain 8 잔존 (F612 Sprint 346)
- no-direct-route-register 1 (F613 Sprint 347)
- service API의 도메인 contract 정제 (F614+)

## 예상 가동 시간

autopilot ~60분. 30 caller 정밀 SQL → service 변환 + service signature 설계 (caller 의도 보존) 부담. F610 ~13분 대비 4~5배.
