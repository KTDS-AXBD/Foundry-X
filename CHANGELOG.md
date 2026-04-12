# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
