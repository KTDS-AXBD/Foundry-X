# Sprint 운영 필수 규칙

> 반복 위반된 feedback memory를 rules/로 승격한 파일 (S268 근본 해소)
> MEMORY.md feedback은 "선택적으로 읽힘", rules/는 "항상 읽힘"

## 1. Master Monitor 필수 (S256 교훈, S268 재위반)

Sprint WT 또는 /ax:task가 **1개 이상** 가동 중이면, `/ax:sprint start` 완료 직후 **반드시 Monitor 도구를 시작**한다.

```
Monitor(
  description: "Sprint N signal + merge-monitor",
  persistent: true,
  command: signal + merge-monitor 로그 tail
)
```

**트리거**: `/ax:sprint start` Phase 5 완료 직후 (bash 모니터와 별도로 Claude Monitor 도구)
**위반 시 증상**: 사용자가 "왜 모니터 안 떠있어?" 질문 — 이미 3회 이상 지적됨

## 2. cs(Claude Squad) 미사용 (S268 교훈)

Sprint WT에서 cs를 자동 실행하지 않는다. ccs 단일 경로만 사용.
- cs가 자체 tmux 세션 + `~/.claude-squad/worktrees/`를 생성하여 Sprint 세션과 이중 구조 충돌
- `cs reset`이 Sprint pane까지 파괴
- 대체: `ccs --model sonnet` + `/ax:sprint-autopilot`

## 3. Sprint 탭 = 배너 + bash 셸 대기 (S268 변경)

`wt-claude-worktree.sh`와 bashrc fallback 모두 `exec bash`로 셸 대기.
ccs는 Master에서 `tmux send-keys`로 주입한다.

```
Phase 3 흐름:
  tmux send-keys -t "$SESSION" "ccs --model sonnet" Enter
  (대기 후)
  tmux send-keys -t "$SESSION" "/ax:sprint-autopilot" Enter
```

## 4. WT 탭 필수 열기 (S271 교훈, 3회 이상 재발)

Sprint WT 생성 후 **Windows Terminal 탭을 반드시 열어야** 한다. tmux detached만으로는 불충분.

**근본 원인**: Claude Code Bash tool은 non-TTY라 `bash -i -c "sprint N"`이 실패 → bashrc sprint() 내부의 wt.exe 호출에 도달하지 못함.

**필수 fallback (bashrc sprint() 실패 시)**:
1. `git worktree add` 직접 실행 (Phase 2a)
2. `tmux new-session -d` 배너+셸 생성 (Phase 2b)
3. **wt.exe로 WT 탭 열기** (Phase 2c — 절대 생략 금지):
```bash
WTE="/mnt/c/Users/sincl/AppData/Local/Microsoft/WindowsApps/wt.exe"
"$WTE" -w 0 new-tab --title "$TAB_TITLE" --suppressApplicationTitle \
  -- wsl.exe -d Ubuntu-24.04 bash -lic "tmux attach -t \"$SESSION_NAME\""
```

**위반 시 증상**: 사용자가 "WT 창이 안 보여" 질문

## 5. task-daemon 필수 시작 (S271 교훈)

Sprint WT 생성 후 **task-daemon이 실행 중인지 확인**하고, 없으면 시작한다.

**근본 원인**: bashrc sprint()의 `_sprint_ensure_monitor()`가 daemon을 시작하지만, Claude Code에서 sprint() 실패 시 이 호출이 누락됨.

**필수 조치 (Phase 2d)**:
```bash
DAEMON_SCRIPT="$(git rev-parse --show-toplevel)/scripts/task/task-daemon.sh"
[ -f "$DAEMON_SCRIPT" ] && bash "$DAEMON_SCRIPT" --bg
```

**위반 시 증상**: signal 감지/merge 자동화가 동작하지 않아 Sprint 완료 후 수동 merge 필요
