# C40 Dogfood — daemon 3중 감지 검증

- **Task**: C40 (C-track)
- **Date**: 2026-04-12
- **Env**: tmux 3.5a, WSL2, worktree `task/C40-daemon-3-dogfood`
- **Scope**: `task-daemon.sh` Phase 1 (signal) + Phase 5a (merged PR) + Phase 5b (orphan WT) 3중 감지 경로
- **GitHub Issue**: https://github.com/KTDS-AXBD/Foundry-X/issues/525
- **Daemon PID**: 984644 (재시작 시 갱신)

---

## 3중 감지 경로 개요

| 경로 | Phase | 트리거 | 주기 | 역할 |
|------|-------|--------|------|------|
| **1차 signal** | `phase_signals` | `task-complete.sh`가 `.signal` 파일 생성 | 15s tick마다 | 정상 완료 경로 |
| **2차 merged PR** | `phase_merged_prs` | GitHub API `gh pr list --state merged` | 4 tick (~60s) | signal 누락 시 백업 |
| **3차 orphan WT** | `phase_orphan_wts` | remote branch 소멸 → PR merge 확인 | 4 tick (~60s), 2 tick 오프셋 | 극단적 누락 최후 방어 |

설계 철학: 세 경로가 서로 독립적 — 어느 하나가 실패해도 나머지 경로가 자동 완료 처리.

---

## 검증 매트릭스

### Phase 1 (signal) — 이 dogfood의 주 경로

| Assertion | 검증 방법 | Result |
|-----------|-----------|--------|
| `task-complete.sh`가 `.signal` 파일 생성 | `ls /tmp/task-signals/Foundry-X-C40.signal` | PENDING |
| daemon이 15s 이내 signal 감지 | 로그: `📡 signal: C40` | PENDING |
| PR merge + WT cleanup 수행 | 로그: `✅ C40 → merged` | PENDING |
| SPEC backlog C40 DONE 갱신 | 로그: `📝 C40 SPEC backlog → DONE` | PENDING |

### Phase 5a (merged PR) — 백업 경로

| Assertion | 검증 방법 | 상태 |
|-----------|-----------|------|
| in_progress task 중 signal 없는 경우 감지 | 로그: `🔍 merged PR #N` | 과거 세션에서 PASS (C39 이전 arc) |
| 합성 signal 생성 후 phase_signals로 처리 | 로그: `📡 ${task_id}: merged PR signal 합성` | 이번 dogfood 주 경로 미해당 |

**참고**: C40은 정상 `task-complete` 경로를 밟으므로 5a가 동작하면 오히려 1차가 실패한 것.

### Phase 5b (orphan WT) — 최후 방어

| Assertion | 검증 방법 | 상태 |
|-----------|-----------|------|
| remote branch 소멸 감지 (`git ls-remote` 기반) | 로그: `🔍 WT orphan: C40` | 이번 dogfood 주 경로 미해당 |
| `gh pr list --head <branch> --state merged`로 PR 확인 | 합성 signal 생성 로그 | 이번 dogfood 주 경로 미해당 |

---

## 사전 상태 확인 (task-complete 호출 전)

```
task cache:
  C40: in_progress
  pane: %17
  wt: /home/sinclair/.claude-work/work/worktrees/Foundry-X/C40-daemon-3-dogfood
  branch: task/C40-daemon-3-dogfood
  issue: https://github.com/KTDS-AXBD/Foundry-X/issues/525

daemon:
  PID: 984644
  tick: 15s
  log: /tmp/task-signals/daemon-Foundry-X.log

C39 완료 로그 (선행 검증):
  [16:18:39] 📡 signal: C39
  [16:18:42] ✅ PR #523 merged
  [16:18:45] 📝 C39 SPEC backlog → DONE (pushed)
  [16:18:45] ✅ C39 → merged
```

---

## task-complete 실행 후 결과 (완료 시 갱신)

```
[여기에 daemon 로그 캡처 추가 예정]
```

---

## 교훈 / 발견

- **3중 감지가 단일 SSOT를 유지하는 방식**: 세 경로 모두 `write_signal()`을 통해 동일한 `.signal` 파일을 생성하므로, `phase_signals`가 최종 처리를 단일화함. 중복 처리 방지는 `[ -f "$sig_file" ] && continue` 가드로 구현.
- **daemon 재시작 후에도 3중 감지 동작**: `FX_CACHE` (`~/.foundry-x/tasks-cache.json`)가 재부팅 후에도 남아있어 상태 복원됨. `/tmp/task-signals/` signal 파일만 날아감 → 5a/5b가 보완.
- **C40이 5a/5b를 트리거하지 않는 이유**: PR이 merge되기 전에 signal이 먼저 생성되어야 daemon이 PR merge를 트리거함. 5a는 merge "이후" PR을 스캔하므로 정상 경로(1차)가 이미 PR을 merge시켜버림.
- **turbo typecheck**: 11/11 PASS (10 cached + 1 fresh, 9.92s)
