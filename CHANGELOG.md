# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- F508: Phase 32 Integration Gap 해소 — ax 스킬 4종(gov-retro, req-manage, session-end, todo)에 Phase 32 스크립트 통합 + sprint-merge-monitor 3훅 (pr-body-enrich/velocity/epic) + CHANGELOG [Phase 32] 롤업 + priority-history F507 backfill + velocity phase 감지 버그 수정 + Sprint 245~248 velocity backfill + board-sync-spec --fix 모드 (Sprint 255 S255)

### Fixed
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
