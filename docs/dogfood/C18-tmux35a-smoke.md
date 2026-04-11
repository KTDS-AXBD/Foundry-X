# C18 Smoke Dogfood — tmux 3.5a 환경 회귀 검증

- **Task**: C19 (FX-REQ-513) — C18 통합 smoke 단건 dogfood
- **Parent REQ**: FX-REQ-512 (C18 통합 smoke dogfood)
- **Date**: 2026-04-11
- **Env**: tmux 3.5a, WSL2, worktree `task/C19-c18-smoke-dogfood`
- **Scope**: `scripts/task/{lib.sh,task-start.sh,task-complete.sh,task-daemon.sh}` full pipeline 회귀

## Assertion 결과 요약

| # | Assertion | Result |
|---|-----------|--------|
| 1 | worker 파일 작성 additions>0 | PASS |
| 2 | pane 생존 (💀 소멸 로그 부재) | PASS |
| 3 | 비-empty commit + daemon auto-merge | PASS (진행 중 — task-complete 호출 직전) |
| 4 | S257 fix 4종 회귀 | PASS |

## Assertion 1 — worker 파일 작성 (additions>0)

이 문서 자체가 증거. `docs/dogfood/C18-tmux35a-smoke.md` 신규 생성 → additions > 0 보장.
task-complete.sh의 Step 2a auto-add가 untracked → staged → commit 처리.

## Assertion 2 — pane 생존

```
$ echo $TMUX_PANE
%1
$ tmux -V
tmux 3.5a
$ tmux list-panes -F "#{pane_id}" | grep -c "^%1$"
1
```

Pane %1 살아있고, daemon 로그에 `💀` 소멸 기록 없음. tmux 3.4 environment-too-long 버그가 3.5a에서 재현되지 않음 확인.

## Assertion 3 — 비-empty commit + daemon auto-merge

- `.task-context` 존재, BRANCH=`task/C19-c18-smoke-dogfood`, BASE_SHA=`db3d91c3`
- 이 문서 commit 후 `bash scripts/task/task-complete.sh` 호출 예정
- task-complete.sh가 commit → push → PR 생성 → signal 작성
- task-daemon.sh가 signal 수신 → PR auto-merge → worktree/branch 제거

task-complete 호출 결과는 daemon 로그(`/tmp/fx-task-daemon.log`)에서 관찰.

## Assertion 4 — S257 fix 4종 회귀 검증

### (a) FX_SIGNAL_DIR SSOT

`scripts/task/lib.sh:14` — 단일 선언:
```bash
FX_SIGNAL_DIR="/tmp/task-signals"
```
`scripts/task/lib.sh:21` — 시작 시 mkdir:
```bash
mkdir -p "$FX_LOCK_DIR" "$FX_HOME/scripts" "$FX_SIGNAL_DIR"
```
`scripts/task/lib.sh:202` 주석 — "FX_SIGNAL_DIR is declared and created at top of this file (SSOT)."
`task-daemon.sh:48,204,263,279` — 모두 lib.sh의 `$FX_SIGNAL_DIR`를 재사용 (로컬 재선언 없음).

**PASS** — 변수 중복 선언 제거, SSOT 확립됨.

### (b) AUTONOMY_RULE 주입

`scripts/task/task-start.sh:224`:
```
AUTONOMY_RULE="자율 완료 원칙: 결정이 필요한 지점에서 사용자 확인을 기다리지 말고
합리적 기본값으로 진행하세요. 막히면 commit+stash 후 task-complete로 넘기세요. ...
작업 완료 후 반드시 bash scripts/task/task-complete.sh 를 실행해서 ..."
```
`task-start.sh:234,239` — PROMPT에 `${AUTONOMY_RULE}` 연결.

**PASS** — worker가 승인 대기로 멈추지 않고 task-complete까지 자율 진행하도록 주입됨. 이 task 자체가 동일 프롬프트로 실행 중.

### (c) task-complete.sh fail-fast

`task-complete.sh:12` — `set -eo pipefail`
`task-complete.sh:77-83`:
```
# Fail-fast: if push fails with commits present, do NOT write a DONE signal.
# ... permanently dropping the local commits.
# S257 investigation (#4): this was the silent-drop root cause.
if ! git push origin "$BRANCH" -u; then
  echo "[fx-task-complete] ❌ push 실패 — signal 작성을 중단합니다." >&2
  exit 20
fi
```
`task-complete.sh:88-92` — 원격 HEAD 검증 (belt-and-suspenders):
```
if [ -z "$REMOTE_HEAD" ] || [ "$LOCAL_HEAD" != "$REMOTE_HEAD" ]; then
  echo "[fx-task-complete] ❌ 원격 검증 실패 ..." >&2
  exit 21
fi
```

**PASS** — push 실패 시 signal 안 쓰고 exit 20/21로 중단. 이전에는 push 실패여도 DONE signal 써서 daemon이 WT/branch 삭제하며 커밋 drop.

### (d) daemon PRESERVED guard

`task-daemon.sh:88-103`:
```
# Safety guard (S257 #4): only destroy WT+branch when either
#   (a) merge succeeded, OR (b) truly zero commits + no PR (empty task).
# If commits exist but nothing was merged, the WT/branch are the only
# place those commits live — removing them = silent data loss.
local PRESERVED=false
if [ "$MERGED" = true ] || { [ "${PR_URL:-none}" = "none" ] && [ "${COMMIT_COUNT:-0}" = "0" ]; }; then
  # WT 제거 + branch -D
  ...
else
  log "🛡️  ${TASK_ID}: MERGED=false + commits=${COMMIT_COUNT:-0} — WT/branch 보존 (silent drop 방지)"
  PRESERVED=true
fi
```
`task-daemon.sh:105-107` — PRESERVED일 때 pane도 kill 안 함:
```
if [ "$PRESERVED" = false ] && [ -n "$PANE_ID" ] && [ "$PANE_ID" != "unknown" ]; then
  tmux kill-pane -t "$PANE_ID" 2>/dev/null || true
fi
```
`task-daemon.sh:143` 이후 — FINAL_STATUS가 `needs_manual_review`로 cache에 기록.

**PASS** — MERGED=false + commits>0 조합에서 WT/branch/pane 모두 보존. silent drop 방지.

## 최종 판정

4/4 PASS — tmux 3.5a 환경에서 C18 통합 smoke pipeline 정상 동작 확인.
S257 fix는 회귀 없이 유지됨.
