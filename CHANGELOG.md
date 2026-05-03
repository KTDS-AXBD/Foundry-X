# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.9.0] - 2026-05-04

> **마일스톤: Phase 46 100% literal 종결** — packages/api/src/services/agent 0 도달. fx-agent MSA 분리 완성 + Strangler 종결. Sprint 312~330 (S306~S321 14 세션 연속 성공, F560~F583).

### Added
- **F583 services/agent heavy 2 → core/agent/services/** (PR #713) — Phase 46 100% **literal** 종결 마지막 한 걸음. autopilot 14분 21초 (두 번째 빠른 기록), Match 98%, OBSERVED P-a~P-m 13/13 PASS (semantic 100%). services/agent 2→**0** 도달, 67 callers import 갱신, fx-agent self-contained closure 0건 확증, dual_ai_reviews 자동 INSERT 2건 (누적 14건). autopilot 옵션 A 변형 14회차 정착화 (cross-package binding 회피 + MSA core/{domain}/ 룰 부분 복원 acceptable variant)
- **F581 services/agent 16→2** (PR #711) — autopilot 12분 32초 (Sprint 최단 기록), Match 100%. services/agent light 14 + DUP 12 + 신규 2 처리, 외부 callers 81건 갱신. codex_verdict=PASS-degraded 신규 카테고리 첫 발생 (codex가 acceptable variant 정교 평가)
- **F582 Phase 47 GAP-4 회복** (PR #710) — Discovery 인프라 12일+ stop 회복. fx-discovery `DiscoveryStageService`에 DiagnosticCollector 호출 + autoTriggerMetaAgent 배선. 4월 21일 모든 metrics stop 패턴 해소 (F560 Pipeline/Stages fx-discovery 이관 부수효과 cross-cutting concern 도메인 분산 미정의). silent fail layer 5 발견·해소 (Sprint 328 signal PROJECT_ROOT 줄 누락 → daemon hook fallback 강건화 `af9308c7`)
- **F580 services/agent KEEP 3 + (ii) 5 = 8 files contract 추출 + fx-agent 이전** (PR #708) — Phase 46 진정 종결 마지막 한 걸음. services/agent 24→16, fx-agent 8 files 신설/이전, 외부 callers 20건 갱신
- **F579 services/agent (i) 17 files deduplicate + 외부 import 갱신** (PR #707) — services/agent 41→24 + core/agent/services 신설 (MSA 룰 부분 복원). codex_verdict=PASS 첫 발생
- **F578 api/services/agent 44 files 분류 + 부분 이전** (PR #706) — Design §A 3분류 작성 (i 20/ii 5/iii 19) + dead code 3 deletion
- **F577 packages/api/src/agent → fx-agent 실 이전** (PR #705) — packages/api/src/agent/ 완전 제거
- **F576 directory rename** (PR #704) — `git mv core/agent → agent` directory rename (semantic ~30%, F577에서 실 이전 진행)
- **F575 잔여 7 routes fx-agent 분리** (PR #701) — Phase 46 본격 진입. fx-agent 15 routes 완성 (F571 8 + F575 7), app.ts mount 0건. autopilot ~1시간 50분, Match 97%
- **F553 Dual-AI 4주 회고 + CONDITIONAL GO** (PR #700) — `docs/04-report/features/phase-46-f553-4week-retrospective.md`. 4 GAP 발견 (GAP-1 save-dual-review 미호출 / GAP-2 output_tokens=0 / GAP-3 27 proposals pending / GAP-4 R6 rawValue=0). GAP-1 즉시 해소 ax-marketplace `03a4e16`
- **Phase 45 SDD Triangle 종결** (Sprint 312~320, F560~F574) — Strangler 분리 + SDD Triangle CI. fx-discovery 7 routes (F567/568) + fx-shaping (F562/563) + fx-collection (F560) + fx-launch (F564/569) + fx-gateway (F570/F574)

### Fixed
- **C103 silent fail 3 layer 풀 fix** (S315) — F553 GAP-1 4주 stale 진정 해소. (a) task-daemon `phase_sprint_signals` STATUS=DONE hook 추가 + (b) save-dual-review.sh python NameError fix (degraded shell `False` literal 미변환, 한 달 silent — F553 GAP-1 hook 무효 1차 원인) + (c) verification routes public mount + X-Webhook-Secret 검증 (401 차단 해소). retroactive INSERT 검증 ✅ Sprint 323 verdict=BLOCK
- **C104 silent fail layer 4 진정 해소** (S317) — `~/.bashrc sprint()`에 `.dev.vars` master→WT 자동 cp 로직 추가 (idempotent, snapshot, 사용자 커스텀 보호). Sprint 325/326/327 신규 WT 검증 ✅ — `🔐 .dev.vars 복사 (C104)` 두 줄 자동 출력. dual_ai_reviews 자동 INSERT 인프라 가동
- **silent fail layer 5 진정 해소** (S319) — daemon `phase_sprint_signals` C103 hook에 PROJECT_ROOT fallback 추가 (`${CLAUDE_WT_BASE:-~/work/worktrees}/${project}/sprint-${N}` 표준 경로) + hook_log idempotent guard

### Changed
- **autopilot 옵션 A 변형 14회차 정착화** — `core/agent/services/`로 이동이 cross-package binding 회피 + MSA core/{domain}/ 룰 부분 복원의 안정적 trade-off. Plan 옵션 C deduplicate를 의도해도 autopilot은 일관되게 옵션 A 채택. fx-agent 분리 단방향 관성 (closure 충족) + MSA 부분 복원 양립
- **F555 LLM 모델 ID 현행화 + 중앙 상수화** (PR #617, #618) — 구버전 모델 ID 최신화 (haiku-20250714→20251001, sonnet-4-5→4-6) + shared/model-defaults.ts 중앙 상수 도입 + undated alias 전환. 97파일, typecheck+3747 tests PASS

### 통계 (v1.8.0 → v1.9.0)
| 지표 | v1.8.0 (Phase 9a, 2026-03-31) | v1.9.0 (Phase 46, 2026-05-04) | 변화 |
|------|:---:|:---:|:---:|
| Phases 완료 | Phase 9a | Phase 46 | +37 phases |
| Sprints | 86~91 | ~330 | +239 sprints |
| F-items | F262 | F583 | +321 items |
| Commits | — | 1,354 | — |
| Days | — | 34 days | — |
| Sprint 평균 Match Rate | — | 95~100% | 14 세션 연속 성공 (S306~S321) |

### Phase 46 회고 핵심
- **Phase 46 100% literal 종결**: services/agent 0 도달 (F576 directory rename → F577 실 이전 → F578 분류 → F579 deduplicate → F580 contract 추출 → F581 light 14 + DUP 12 + 신규 2 → F583 heavy 2 → 0). 점진적 종결 경로 확립
- **autopilot 학습 진화**: PASS-degraded 신규 카테고리 발생 (F581 sprint 329) — codex가 acceptable variant 정교 평가 시작. dual_ai_reviews 인프라 정교화
- **silent fail layer 5단 종결**: 한 layer fix 후 다음 layer 노출 사이클 반복 — C103 (3 layer) + C104 (.dev.vars) + S319 (PROJECT_ROOT fallback)
- **표면 충족 함정 14회차 회피 패턴**: Plan §3 OBSERVED numerical 강제 (특히 P-a + P-c 동시 충족) + 사전 측정 정밀화 (callers 81 분류) 결합 효과

### Changed
- F555 LLM 모델 ID 현행화 + 중앙 상수화 (PR #617, #618) — 구버전 모델 ID 최신화(haiku-20250714→20251001, sonnet-4-5→4-6) + shared/model-defaults.ts 중앙 상수 도입 + undated alias 전환. 97파일, typecheck+3747 tests PASS

### Phase 42+43 통합 회고: HyperFX Deep Integration + Activation (Sprint 284~289)

> **Dogfood-driven 개발 교과서 사례** — 5회 반복 dogfood로 2개 숨은 버그 발견+해소

#### 지표 변화
| 지표 | Phase 41 완료 | Phase 43 완료 | 변화 |
|------|:------------:|:------------:|:----:|
| F-items | F530 | F536 + F537 hotfix | +6 F + 2 hotfix |
| D1 Migrations | 0133 | 0135 | +2 (0134 proposal_applied_at, 0135 graph_sessions) |
| 코드 추가 (Phase 42+43) | — | +8,344줄 | 91 files |
| PR 수 | — | 17개 (#558~#573) | Phase 42 4개, Phase 43 5개 + hotfix 5개 + dogfood 3개 |
| Sprint 평균 Match Rate | 97% | 96% (Phase 42) | 유지 |
| prod agent_run_metrics | 0 | 27 | F534+F537 실증 |

#### 잘된 점
- **Dogfood-driven 검증 도입**: Phase 42 완료 직후 실 데이터(KOAMI)로 prod D1 실측 → "agent_run_metrics 0건"이라는 숨은 갭을 즉시 발견. 설계 문서 + TDD + Gap Analysis 96% 모두 통과했지만 prod 실측 없이는 찾을 수 없던 결함
- **5회 반복 검증 + hotfix 2회**: 1차(갭 발견) → 3차(F534 hotfix PR#565로 훅 활성화) → 5차(F537 hotfix PR#573으로 session_id 정합성) — 각 라운드마다 새 계층의 버그 발견
- **autopilot 완주**: Sprint 284~289 6개 Sprint 모두 Full Auto 완주 (Plan→Design→TDD→Implement→Verify→PR)
- **임시 API 스캐폴딩**: PR #563 임시 dogfood API로 차단 해소 후 F535에서 정식 API로 대체 — 단계적 전환

#### 개선점
- **"Optional 파라미터 함정"**: F534가 `diagnostics?: DiagnosticCollector`를 optional로 만들었지만 실제 호출 사이트는 모두 미주입 → TDD도 통과 → prod에서 0건. **autopilot이 "주입 사이트 검증" 단계를 놓치는 패턴** — Design 체크리스트에 명시 필요
- **"식별자 불일치 함정"**: F536 autoTrigger가 graph sessionId로 collect하지만 stage-runner는 다른 session_id 사용 → silent 0건. **계층 간 식별자 계약 검증** 부재
- **In-memory mock의 맹점**: Phase 42 E2E 9/9, F534 TDD 8/8, F536 TDD 10/10 — 모두 PASS. 하지만 계층 연결 오류는 mock 테스트로 감지 불가
- **JWT 만료 중 재시작 필요**: dogfood 4회째에서 JWT 만료 → 사용자에게 새 JWT 요청 → 진행 재개. API 실행이 30분 이상 걸리는 경우 빈번

#### 결정 검증
- ✅ **Dogfood-first 전환**: 이번 세션이 "prod 실측 = 가장 값싼 디버거" 원칙의 실증. 이후 Phase 완료 직후 1회 dogfood를 Phase Exit Criteria에 포함 권장
- ✅ **hotfix 즉시 적용**: F534/F536 갭 발견 직후 3~5분 내에 hotfix PR 작성/merge — 컨텍스트 유지된 빠른 수정
- ⚠️ **"Walking Skeleton 완성 = 완료" 착각**: Phase 41이 "완성"이라 선언했지만 실제로 데이터가 흐르지 않았음 — "Smoke Reality" 체크가 Exit Criteria에 없었음
- ⚠️ **MetaAgent 프롬프트 품질**: 구조적 갭 해소 후에도 proposals 빈 배열 반환 — Phase 44에서 별도 해소 필요

#### 다음 방향
- **Phase 44 후보 — MetaAgent 프롬프트 품질**: score < 70인 축에 대해 실제 proposal 생성하도록 프롬프트 강화
- **Design Exit Criteria 개선**: "주입 사이트 전수 검증" + "계층 간 식별자 계약 검증" 체크리스트 추가
- **Phase Exit Criteria에 Smoke Reality 1회 필수**: prod D1 실측 1회 후 Phase 완료 선언

### Phase 41 회고: HyperFX Agent Stack (Sprint 280~283)

#### 지표 변화
| 지표 | Phase 39 완료 | Phase 41 완료 | 변화 |
|------|:------------:|:------------:|:----:|
| F-items | F523 | F530 | +7 (Phase 40+41) |
| D1 Migrations | 0131 | 0133 | +2 |
| 코드 추가 (Phase 41) | — | +7,640줄 | 4 Sprint |
| 파일 추가 (Phase 41) | — | 76파일 | 4 PRs |
| Sprint 평균 Match Rate | — | 97% | 일관 |

#### 잘된 점
- **Full Auto 한 세션 완주**: req-interview(6 Phase) → pipeline 분석 → Sprint 4개 순차 Full Auto → session-end까지 단일 세션에서 완주. PRD부터 프로덕션 배포까지의 자동화 성숙도가 높아짐
- **Pipeline 가능 여부 사전 판정**: 의존성/변경 영역/D1 3기준으로 병렬 불가를 사전에 판정하여 merge conflict 없는 깔끔한 순차 실행
- **Walking Skeleton 효과**: 4개 레이어를 최소 구현으로 전체 구조를 한 번에 완성 — 이후 Deep Integration에서 점진적 확장 가능

#### 개선점
- **stale Monitor 생명주기 문제**: S272의 persistent Monitor가 세션을 넘어 살아있어 Sprint 278~280 이벤트까지 캐치 → 노이즈. C51로 근본 원인 분석 + ax-plugin 스킬 수정 완료
- **merge-monitor CI 타이밍**: 4개 Sprint 모두 auto-merge가 merge-monitor보다 먼저 완료되어 FAIL로 판정됨 — 매번 수동 확인 필요. merge-monitor가 `state=MERGED`를 먼저 체크하도록 개선 필요 (후속 C-track)

#### 결정 검증
- ✅ **순차 실행 판정**: 병렬 불가 판정이 올바른 결정 — 4개 Sprint 모두 conflict 0건
- ✅ **Walking Skeleton 접근**: 4-Layer 전체를 최소 구현한 것이 효과적 — 각 레이어가 독립적으로 테스트 가능한 상태
- ⚠️ **merge-monitor 의존**: auto-merge 환경에서 merge-monitor의 CI 체크 로직이 불필요한 복잡도 추가 — 단순화 검토 필요

#### 다음 방향
- **Deep Integration**: Walking Skeleton → 실제 발굴 파이프라인 연동 (Graph 실행 E2E)
- **스트리밍 E2E**: WebSocket/SSE 실제 에이전트 이벤트 연동 테스트
- **MetaAgent 실전**: 6축 메트릭 실 데이터 수집 + 개선 제안 품질 검증
- **merge-monitor 개선**: auto-merge 환경에서 state=MERGED 우선 체크 로직

### Added
- **Phase 43 HyperFX Activation** (Sprint 287~289, PR #564/#569/#571, +1,879줄): Plumbing → Real Data Flow — F534 DiagnosticCollector 실행 경로 훅 삽입 (PR #565 hotfix로 주입 사이트 활성화), F535 Graph 실행 정식 API + UI (D1 0135 graph_sessions + DiscoveryGraphPanel), F536 MetaAgent 자동 진단 훅 (fire-and-forget auto-trigger)
- **Phase 43 F537 hotfix** (PR #573): MetaAgent auto-trigger session_id 불일치 해소 — `collectByBizItem()` 메서드 추가 (LIKE `stage-%-{bizItemId}` 패턴). Dogfood 5차 검증에서 발견
- **Phase 42 HyperFX Deep Integration** (Sprint 284~286, PR #558/#559/#560, +2,454줄, Gap 96%, E2E 9/9): Walking Skeleton → 실 데이터 연동 — F531 발굴 Graph 실행 연동(DiscoveryGraphService.runAll, 41 tests, Gap 95%), F532 에이전트 스트리밍 E2E(Playwright + TDD), F533 MetaAgent 실전 검증(proposal-apply full loop, D1 0134 applied_at)
- **Phase 42+43 Dogfood** (PR #563 임시 API + `scripts/dogfood-graph.sh`): KOAMI(bi-koami-001) 실 데이터로 5회 반복 검증 — agent_run_metrics 0→27건 확증, MetaAgent 6축 점수 실측(overallScore 58)
- **Phase 41 HyperFX Agent Stack** (Sprint 280~283, PR #549/#552/#553/#555, +7644줄): 4-Layer Agent Stack Walking Skeleton — F527 Agent Runtime(defineTool, AgentSpec YAML, 7 agent migration), F528 Graph Orchestration(GraphEngine, Agents-as-Tools, Steering, 발굴 9단계 Graph), F529 Agent Streaming(SSE, D1 metrics, Web dashboard), F530 Meta Layer(DiagnosticCollector 6축, MetaAgent, Human Approval UI)
- **Phase 40 Agent Autonomy** (Sprint 278~279, PR #548/#550): F524 E2E 시나리오 자동 추출, F525 Gap-E2E 통합 점수, F526 autopilot Verify E2E 통합
- **Sprint 277 MSA Phase 2** (PR #544, Gap 97%): F522 shared 타입 슬리밍(Discovery 전용 3파일 fx-discovery 이동) + F523 D1 격리(fx-discovery items GET 라우트 이관, fx-gateway DISCOVERY binding 하드와이어, deploy.yml MSA job, D1 접근 규약 문서)
- **Sprint 276 Dashboard Overhaul** (PR #543): F519 대시보드 현행화 — 파이프라인 6→2단계, 퀵 액션 정리, 위젯 삭제, ToDo UX
- **Sprint 268 MSA Walking Skeleton** (PR #535): `packages/fx-gateway/` API 게이트웨이 Worker + `packages/fx-discovery/` Discovery 독립 Worker 생성 (F520/F521 ✅, Gap 100%). PRD: `docs/specs/fx-msa-roadmap/prd-final.md` (3-AI R2 검토, Ambiguity 0.150)
- **S268** (PR #532, #534): /work-management 대시보드 대폭 개선 — Roadmap 탭(Phase 타임라인 + ROADMAP.md 미래 계획), Changelog 탭(react-markdown 렌더링), 불필요 탭 4개 제거(Context Resume/Sessions/Pipeline/Velocity), AXIS 디자인 토큰 적용, 탭 한글화, `GET /api/work/changelog` + `GET /api/work/roadmap` 엔드포인트
- **C44/C45/C49** (PR #534): Backlog C/B/X-track 파싱(`parseBacklogItems`), 작업 분류 사용법 안내, `getPhaseProgress` SPEC §3 직접 파싱, `fetchSpecText` 캐시
- **Phase 37 Work Lifecycle Platform** (PRD final): F516 Backlog 인입 파이프라인 + 실시간 동기화, F517 메타데이터 트레이서빌리티, F518 Work Ontology — 3 Sprint (267~269)
- **C50**: req-interview 스코어카드 채점 메커니즘 개선 Backlog 등록
- **C33** (PR #510): eslint `no-explicit-any` cleanup — 코드 품질 개선
- **C33~C37** backlog 5건 PLANNED 등록: lint cleanup / Node 24 / git author 분리 / sidebar link / Gap E2E 확장
- **ax-plugin infra-selfcheck C9**: Plugin Cache Drift 점검 추가 ([ax-plugin PR #1](https://github.com/KTDS-AXBD/ax-plugin/pull/1)) — Same-HOME source(flat) ↔ cache(versioned `ax/<version>/`) drift 감지. skills/ + hooks/ `diff -rq`, FAIL severity, version 자동 탐지
- **SessionStart hook L3 확장**: `~/scripts/ax-cache-drift-auto.sh` + settings.json 2nd hook entry — 세션 시작 시 ax-plugin cache drift 자동 알림 (git orphan L3와 동일 패턴)
- **Landing/README drift 동기화** (PR #508): Sprint 240→261, Phase 29→33 수치 일괄 보정
- **F509** (Sprint 261, PR #503 `e942b87d`, Gap 98%, 실소요 ~3h): **Phase 33 Work Management Observability Walking Skeleton** — Backlog/REQ/Task/Sprint/Epic 4-channel 통합 뷰 + 자연어 분류 파이프라인. M1 `GET /api/work/snapshot`(SPEC.md GitHub raw + commits + PRs 집계), M2 `/work-management` React Router 4컬럼 Kanban + 5s polling, M3 `GET /api/work/context`(recent commits + next_actions), M4 `POST /api/work/classify`(Claude Sonnet LLM + regex fallback). `/ax:req-interview` dogfood로 PRD 생성 (Phase 2 API Review 73/100 Conditional + ChatGPT flaw §5.2.1 수동 보강). PRD: `docs/specs/fx-work-observability/prd-v1.md`, REQ: FX-REQ-526
- **E2E work-management.spec.ts** (PR #507 `6a9d395e`): `/ax:e2e-audit Sprint 261`로 coverage gap 0건 감지 후 5 tests 신규 작성 — route render, kanban 4 columns, snapshot polling, tab switching, classify flow (PRD §5.2.1 S1). 모든 mock은 `page.route` fulfill (LLM 의존 제거, CI safe). autopilot Gap 98%의 E2E 측정 범위 한계 실증
- F508: Phase 32 Integration Gap 해소 — ax 스킬 4종(gov-retro, req-manage, session-end, todo)에 Phase 32 스크립트 통합 + sprint-merge-monitor 3훅 (pr-body-enrich/velocity/epic) + CHANGELOG [Phase 32] 롤업 + priority-history F507 backfill + velocity phase 감지 버그 수정 + Sprint 245~248 velocity backfill + board-sync-spec --fix 모드 (Sprint 255 S255)

### Changed
- **cs(Claude Squad) 제거** (`sprint-ops.md`): Sprint 세션 이중 구조 충돌 해소 — `wt-claude-worktree.sh`에서 cs 자동 실행 제거, ccs 단일 경로로 단순화. feedback memory → `.claude/rules/sprint-ops.md` 승격
- **SPEC F번호 충돌 정비** (`b753e555`): Phase 37~39 이중 등록 해소 + Sprint 268 결과(F520/F521 ✅) 매핑

### Fixed
- **S267** (`6461fcce`): task-daemon nullglob leak + phase error isolation — `phase_sprint_signals()`가 `shopt -s nullglob`을 복원하지 않아 다음 tick `phase_signals()`의 `ls` glob이 빈 확장 → `source AGENTS.md` → daemon crash. 수정: nullglob 저장/복원, `ls` glob → for-glob 전환, run_daemon loop에 `|| log` 방어, `cd "$REPO_ROOT"` → `git -C`, grep pipefail 방어
- **S260 C32** (PR #506 `b6577d8f`, FX-REQ-527): deploy.yml concurrency + paths filter meta-aware 개선 — (1) `on.push.paths-ignore`에 `SPEC.md`/`CHANGELOG.md`/`docs/**`/`.claude/**` 명시(workflow 트리거 자체 차단), (2) `concurrency.cancel-in-progress: false`(2중 방어). 배경: Sprint 261 F509 수습 도중 autopilot 메타 커밋 체인이 본 커밋 deploy run을 concurrency cancel하는 구조적 함정 발견
- **S260 Sprint 261 test debt unblock** (PR #504 `1473f123`): F509 배포 경로를 막던 pre-existing 테스트 2건 fix (Sprint 261 무관) — (1) `mcp-adapter.test.ts` `TASK_TYPE_TO_MCP_TOOL` length 13→14 + 누락 5건 expect(`infra-analysis`/`bmc-generation`/`bmc-insight`/`market-summary`/`discovery-analysis`), (2) `stage-runner-service.ts` `runStage` 성공 후 상태를 `in_progress` → `completed`로 복귀(race condition 가드의 영구 lock 해소)
- **S260 C31** (PR #502): `task-start.sh` inject에 bracket paste workaround — `tmux send-keys`의 text와 Enter를 별도 호출로 분리(sleep 0.3~0.5s gap). Sprint 261 autopilot inject에서 실전 첫 검증 PASS
- **S260 C30** (PR #500): `task-daemon.sh` 수동 재시작 경로 방어 — `nohup ... & disown`로 기동 시 pidfile 누락되어 중복 spawn되던 문제 해결
- **S260 C29** (PR #498): `daemon_pre_evict` 로그에서 primary `$PANE_ID` 제외 + `extra_count` 필드 추가 — C27 이후 매 cleanup마다 primary가 스윕 이벤트에 포함되던 semantic 오류 수정
- **S260 C28** (PR #496, FX-REQ-522): task-start.sh WT worker 계정/모델 정합성 — (1) `tmux split-window -e HOME="$HOME"`로 Master multi-account HOME 전파(login shell HOME reset 차단), (2) `CCS_WT_CMD="${CCS_BIN} --model claude-sonnet-4-6"` inject(`feedback_sprint_model.md` "WT=Sonnet" 원칙 첫 구현). 효과: 다음 task부터 worker statusline `ktds.axbd` + Sonnet 4.6 자동. C27 pre-evict 실전 첫 발동 dogfood 부산물
- **S260 statusline-command.sh** (HOME 직접편집, git 비추적): `~/.claude/statusline-account` 유물 삭제, override 로직 제거(line 71-78), 변수명 `github_user` → `claude_account`, 레이아웃 주석 `<claude account>`. HOME-aware SSOT = `$HOME/.claude.json` oauth.emailAddress
- **S260 C27** (PR #494, FX-REQ-521): task-daemon `phase_signals` cleanup에 pre-eviction 스윕 추가 — `git worktree remove --force` 직전에 `tmux list-panes -a`로 `$WT_PATH` 자체/하위 cwd를 가진 모든 pane을 `kill-pane`, `log_event daemon_pre_evict` JSONL 기록. S257 tmux 3.4 segfault 이후 3층 방어(3.5a 근본 + pre-evict 실행중 + orphan-scan Phase 4 post-hoc)의 두 번째 층
- **S260 HOME scan Phase 4** (git 비추적): `/home/sinclair/scripts/git-orphan-scan.sh`에 tmux pane zombie 탐지 phase 추가 — cwd 물리 부재 / `$CLAUDE_WT_BASE/$PROJECT/*` 하위 worktree list 이탈 / `pane_dead=1`. quiet 모드에 `(tmux zombies: N)` suffix, JSON `zombie_panes` 배열. exit code는 git orphan에만 반응(좀비는 환경 상태)
- F505: velocity record-sprint.sh의 MEMORY.md 경로가 C10 symlink 이후 미대응이었던 문제 (.claude-work/ 우선 fallback)
- F505: velocity phase 감지 휴리스틱 버그 — "max Phase 번호" 방식이 Sprint 245/247을 Phase 31로 잘못 기록 (S255 audit에서 감지, 4단계 cascade로 재설계)
- F505: record-sprint.sh가 빈 F_ITEMS 실행 시 기존 backfill 데이터를 clobber하던 문제 (보호 guard 추가)
- F507: record-change.sh append race condition — workflow + manual 동시 실행 시 파일 손상 가능 (flock 10s + dedupe)
- F503: board/_common.sh의 gh token scope 부족을 silent fail로 처리하던 문제 (loud error + 안내 메시지)

## [Phase 32] - 2026-04-11

거버넌스 갭 G1~G7 전건 해소 — Work Management System 4-Layer (Intake→Planning→Execution→Tracking).
Sprint 245~248, 7 F-items, 평균 Match Rate ~99%.

### Added
- F501: GitHub Projects Board 초기 설정 — Kanban 6컬럼 + 자동 라벨링 (Sprint 245, G1/G3/G6 해소)
- F502: CHANGELOG.md 도입 — Keep a Changelog 형식 + session-end/gov-retro 연동 (Sprint 245, G4 해소)
- F503: `/ax:todo` Board 연동 — `scripts/board/{list,move,sync-spec}` + 양방향 동기화 (Sprint 246, G3 해소)
- F504: `/ax:session-end` Board 동기화 — `scripts/board/{on-merge,pr-body-enrich}` + sprint-merge-monitor 통합 (Sprint 246, G6 해소)
- F505: Velocity 추적 — `scripts/velocity/{record-sprint,phase-trend}` + `docs/metrics/velocity/sprint-*.json` (Sprint 247, G5 해소)
- F506: Epic(Phase) 메타데이터 — `scripts/epic/{setup-milestones,phase-progress}` + GitHub Milestones 매핑 (Sprint 247, G2 해소)
- F507: Priority 변경 이력 — `scripts/priority/{record-change,list-history}` + `.github/workflows/priority-change.yml` + `docs/priority-history/` (Sprint 248, G7 해소)

### Fixed
- merge-monitor branch protection 404 정수 비교 오류 (S251)
- merge-monitor wait_ci timeout이 gh --watch 프로세스를 kill하지 못하던 문제 (S251)
- sprint-autopilot Step 1 `/rename` 명시화 — 세션 식별 안정화 (S251)

## [Phase 31] - 2026-04-10

Task Orchestrator 기반 인프라 — Master pane 내 F/B/C/X 4트랙 + flock 동시성 + Sprint 자동 merge-monitor.
Sprint 241~244, 3 F-items.

### Added
- F497: Task Orchestrator MVP (S-α) — `/ax:task start|list|adopt|doctor` + flock ID allocator + fx-task-meta + 4트랙
- F499: Task Orchestrator S-β — doctor/adopt/park 서브커맨드 + Master↔Worker IPC + heartbeat (Sprint 244)
- F500: Sprint auto Monitor+Merge 파이프라인 — signal 감시→PR review→squash merge→cleanup 자동 체인 (Sprint 244, C11 승격)

## [Phase 30] - 2026-04-09

### Added
- F493: 발굴 단계 평가결과서 v2 — 9탭 리치 리포트

### Fixed
- F494: 파이프라인 단계 전진 구조 버그
- F492: FileUploadZone API 경로 drift

### Changed
- F495: 파이프라인 재구조화 — 발굴/형상화 2-stage
- F496: 발굴 9기준 체크리스트 정보형 재설계

## [Phase 29] - 2026-04-08

### Added
- F488: req-manage --create-issue 기본화
- F489: gov-retro 회고 통합 소급 등록

### Fixed
- F490: E2E workflow shard 병렬화

### Changed
- F491: 테스트 공유 Org 모드
