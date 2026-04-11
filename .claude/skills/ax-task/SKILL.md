---
name: ax-task
description: Task Orchestrator (S-β) — B/C/X 3트랙 task 등록 + WT 생성 + tmux split + GitHub Issue + REQ 자동 발급. F-track은 Sprint 전용. /ax:task start|list|doctor|adopt|park|resume 지원.
---

# ax-task — Task Orchestrator (S-α MVP)

> **PRD**: `docs/specs/fx-task-orchestrator/prd-draft.md` (v0.4)
> **Phase**: S-α MFS (F497, FX-REQ-489)
>
> 이 스킬은 `wtsplit` 의 한계(타이틀 매핑 / 식별 불가 / 충돌 미해결)를 해소하기 위한 *Master pane 기반* task 실행 진입점이에요. S-α는 `start` + `list` 만 제공합니다. `merge` / `doctor` / `quick` / `adopt` / `park` 는 S-β 이후.

## 트리거
- "task start", "/ax:task start", "task 등록"
- "task list", "task 목록", "현재 task"

## 의존성
- Repo 루트에 `scripts/task/lib.sh`, `scripts/task/task-start.sh`, `scripts/task/task-list.sh`
- `~/.foundry-x/` (없으면 `lib.sh` 가 자동 생성)
- `flock`, `jq`, `gh` (Issue 생성 — 없으면 degraded)
- `git worktree` 사용 가능
- master 브랜치 + clean working tree

## Subcommands

### `/ax:task start <track> "<title>"`

**track**: `B` (Bug) | `C` (Chore) | `X` (eXperiment/Spike)

> **F-track은 Sprint/Phase 전용**이에요. Feature급 작업은 `bash -i -c "sprint N"` 경로를 사용하세요.

실행 흐름 (PRD §4.1.1):

1. **사전 조건**: `.sprint-context` 부재 + master 브랜치 + clean working tree + WIP cap (3) 미초과
2. **flock id-allocator** → 다음 ID 할당 (SPEC.md + cache 스캔, 트랙별 max+1)
3. **SPEC.md 등록**: `<!-- fx-task-orchestrator-backlog -->` 마커 블록에 한 줄 추가 → commit
4. **flock master-push** → `git push origin master` 직렬화 + `pushed_sha` 고정
5. **`git worktree add -b task/<ID>-<slug> <wt> <pushed_sha>`** (HEAD 아닌 SHA 기준 — race 방지)
6. **첫 commit body**에 ` ```fx-task-meta\n{...json...}\n``` ` 블록 작성 — `.task-context` 유실 시 권위 소스
7. **tmux split-window -h -c <wt>** + pane title + `@fx-task-id` user-data 주입
8. **GitHub Issue 생성** + label 4종 (`fx:track:<T>`, `fx:status:in_progress`, `fx:wip:active`, `fx:risk:medium`) — 실패 시 degraded
9. **`~/.foundry-x/tasks-cache.json`** + `task-log.ndjson` 갱신

**Abort 매핑** (PRD §4.1.1):

| 단계 | 정리 | 상태 |
|------|------|------|
| Step 3 SPEC commit 실패 | `git checkout -- SPEC.md` | FAILED_SETUP |
| Step 4 push 실패 | `git reset --hard HEAD^` | FAILED_SETUP |
| Step 5 WT 생성 실패 | master 등록 commit revert + push | FAILED_SETUP |
| Step 8 Issue 생성 실패 | cache `pending_issue=true` | IN_PROGRESS (degraded) |

**호출 방법** (직접):
```bash
bash scripts/task/task-start.sh B "presign Worker proxy hot fix"
```

**S-α 비수용**: `--quick`, `--scope`, `--no-tmux`, `--no-issue` 옵션은 모두 S-β 이후.

### `/ax:task list`

`~/.foundry-x/tasks-cache.json` 을 읽어 활성 task 테이블 출력. S-α 는 cache-only — liveness probe (PID/heartbeat) + GitHub label 동기화는 S-β 에서 추가.

```bash
bash scripts/task/task-list.sh           # 표 형식 (LIVE 컬럼 포함)
bash scripts/task/task-list.sh --json    # 원본 cache 덤프
```

LIVE 컬럼: ✅ alive / ⚠️ stale (5~10분) / ❌ dead (>10분) / — 감시 대상 아님.

### `/ax:task doctor` (S-β)

SPEC ↔ Issue ↔ WT ↔ cache ↔ log ↔ signal 9개 정합성 검사를 실행합니다.

```bash
bash scripts/task/task-doctor.sh           # 검사만 (dry-run)
bash scripts/task/task-doctor.sh --fix     # 자동 보정
bash scripts/task/task-doctor.sh --task C5 # 특정 task만
```

auto-fix 가능: #3 orphan WT 재등록 · #4 heartbeat reset · #5 stale PID 정리 · #6 signal↔cache drift · #7 orphan lock · #8 cache rebuild. 그 외(#1/#2/#9)는 수동 판단.

### `/ax:task adopt` (S-β)

`git worktree list` 에 있지만 cache 에서 빠진 고아 WT를 다시 등록합니다.

```bash
bash scripts/task/task-adopt.sh                    # 모든 고아 WT 탐색
bash scripts/task/task-adopt.sh --wt <path>        # 특정 WT 1개
bash scripts/task/task-adopt.sh --dry-run          # 미리보기만
```

복구 소스 우선순위: `.task-context` → 없으면 commit body 의 `fx-task-meta` JSON 트레일러(권위 소스).

### `/ax:task park|resume` (S-β)

진행 중 task 를 일시 정지/재개합니다. heartbeat daemon 중단, Issue label `fx:status:in_progress` ↔ `fx:status:parked` 전환, cache status 동기화.

```bash
bash scripts/task/task-park.sh park C5 --reason "waiting for dependency"
bash scripts/task/task-park.sh resume C5
```

## Steps (Claude 가 실행할 절차)

사용자 메시지에서 트리거 감지 시:

### A. `/ax:task start <track> "<title>"` 케이스

1. **사전 검증** — Bash 도구로 `git rev-parse --show-toplevel` 확인 → repo 루트로 cd
2. **track / title 파싱**
   - track 미지정: 사용자에게 AskUserQuestion 으로 B/C/X 중 선택 요청 (F는 Sprint 전용이라 안내)
   - title 미지정: 사용자에게 한 줄 제목 요청
3. **실행**: `bash scripts/task/task-start.sh <track> "<title>"`
4. **결과 보고**: 출력된 ID / branch / wt / pane / issue URL 을 사용자에게 정리해서 전달
5. **다음 행동 안내**: "WT 탭으로 이동하시거나, Master 에서 후속 작업 계속하실 수 있어요"

### B. `/ax:task list` 케이스

1. `bash scripts/task/task-list.sh` 실행
2. 출력 그대로 사용자에게 전달 (장식 X)

## 거버넌스 매핑 규칙

### Track ↔ Sprint/Phase/Version

| Track | 실행 경로 | Sprint 편입 | Phase 소속 | Version |
|-------|----------|:----------:|:---------:|:-------:|
| **F** (Feature) | `bash -i -c "sprint N"` | 필수 (Sprint N) | Phase N에 배치 | SemVer Minor |
| **B** (Bug) | `/ax:task start B "..."` | 선택 (보통 독립) | Phase 밖 | — |
| **C** (Chore) | `/ax:task start C "..."` | 선택 (보통 독립) | Phase 밖 | — |
| **X** (Experiment) | `/ax:task start X "..."` | 불가 (merge 없음) | Phase 밖 | — |

### REQ 코드 체계

- **F-track**: SPEC §5에서 `(FX-REQ-NNN, P{N})` 포맷으로 수동 등록 (기존 체계)
- **B/C/X**: `task-start.sh`가 `allocate_req_id()`로 자동 발급 + SPEC Backlog 등록
- REQ 번호는 F-track과 B/C/X가 같은 시퀀스를 공유 (FX-REQ-001~)

### SPEC 등록 위치

- **F-track**: §5 기능 항목 (Sprint 섹션) + §6 Execution Plan
- **B/C/X**: `<!-- fx-task-orchestrator-backlog -->` 마커 블록 (§6~§7 사이)

## Gotchas

- **Master 외 브랜치에서 실행 금지**: 현재 브랜치가 master 가 아니면 task-start.sh 가 자체 reject
- **sprint WT 내부 실행 금지**: `.sprint-context` 가 있으면 reject (중첩 방지, PRD §7.2)
- **`git add .` 절대 금지** — 멀티 pane 사고 패턴 (CLAUDE.md / git-workflow.md)
- **Issue degraded 상태**: gh 실패 시 `task` 자체는 계속 진행되며, S-β 의 `doctor` 가 후속으로 Issue 를 생성합니다 (S-α 에서는 수동)
- **PID/heartbeat 미구현**: S-α 의 `.task-context` PID 는 task-start.sh 의 PID (Claude Code 본체 PID 가 아님). S-β 에서 PostToolUse hook 으로 정확한 PID + heartbeat 갱신
- **flock 타임아웃**: id-allocator 10s, master-push 30s. 초과 시 abort + 사용자 재시도 안내

## S-α 산출물 점검 리스트
- [x] `~/.foundry-x/{locks,scripts}/`, `task-log.ndjson`, `tasks-cache.json`, `notifications.ndjson`, `wip-overrides.log`
- [x] `scripts/task/lib.sh` — flock allocator + cache helper + WIP cap
- [x] `scripts/task/task-start.sh` — Step 1~9 전체
- [x] `scripts/task/task-list.sh` — cache 테이블 렌더
- [x] `.claude/skills/ax-task/SKILL.md` — 본 파일
- [x] GitHub Issue label 18종 (Phase 31 준비 시 일괄 생성)
- [ ] 1주 사용 후 Go/No-Go 판정 (S-α §7.1 기준): start ≥ 5회, 만족도 ≥ 4/5, race 사고 0건
