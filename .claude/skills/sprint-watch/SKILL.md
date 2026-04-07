---
name: sprint-watch
description: Sprint WT 완료까지 자동 모니터링 + 완료 시 merge pipeline 실행
user_invocable: true
---

# Sprint Watch — 완료 대기 + 자동 Merge

Sprint worktree가 완료될 때까지 Master 세션에서 자동으로 모니터링하고,
DONE 감지 시 review → PR → merge → deploy → cleanup을 자동 실행한다.

## 사용법

```
/sprint-watch          # 활성 Sprint 자동 감지
/sprint-watch 203      # Sprint 203 모니터링
```

## 동작

### 1. Sprint 감지

인자가 없으면 활성 Sprint를 자동 감지한다:
```bash
# signal 파일에서 활성 Sprint 찾기
ls /tmp/sprint-signals/*.signal 2>/dev/null
# 또는 worktree에서 찾기
git worktree list | grep sprint
```

### 2. 모니터링 루프

**폴링 간격**: 45초
**최대 대기**: 3시간 (Sprint 1개 = 20~40분, 여유 포함)

매 폴링마다 **2-source 감지** (signal + sprint-context):
1. Signal 파일 읽기: `/tmp/sprint-signals/{PROJECT}-{N}.signal`
2. Signal에 STATUS가 없거나 CREATED이면 → `.sprint-context` 폴백 읽기: `{WT_DIR}/.sprint-context`
3. 두 소스 중 더 진행된 상태를 채택
4. tmux pane 마지막 30줄 캡처 (진행 상황 파악)

> **왜 2-source?** autopilot 구현에 따라 signal 파일(`/tmp/sprint-signals/`)에 쓰는 경우와
> `.sprint-context`(WT 디렉토리 내)에 쓰는 경우가 혼재한다. Sprint 203에서 signal만 폴링하다
> DONE을 놓친 사례 발생 (S203 교훈).

### 3. 상태별 동작

| STATUS | 동작 |
|--------|------|
| `CREATED` | 대기 (autopilot 기동 중) |
| `IN_PROGRESS` | CHECKPOINT 변화 시 진행률 출력 |
| `DONE` | → Phase 4 (Merge Pipeline) 진입 |
| `FAILED` | 에러 메시지 출력 + 사용자에게 AskUserQuestion |

**진행률 표시** (CHECKPOINT 기반):
```
| Checkpoint | 진행률 | 설명 |
|------------|--------|------|
| plan       | 15%    | Plan 작성/확인 |
| design     | 30%    | Design 문서 생성 |
| implement  | 55%    | 코드 구현 |
| test       | 70%    | 테스트 실행 |
| analyze    | 80%    | Gap Analysis |
| report     | 90%    | 완료 보고서 |
| push       | 95%    | git push |
| signal     | 100%   | DONE signal 생성 |
```

진행률이 변경될 때만 출력한다 (동일 checkpoint 반복 시 무시).

### 4. Merge Pipeline (DONE 감지 시)

Signal 또는 `.sprint-context`에서 정보를 읽어 자동 실행:

```bash
# 2-source: signal 우선, sprint-context 폴백
SIGNAL_FILE="/tmp/sprint-signals/${PROJECT}-${N}.signal"
CONTEXT_FILE="${WT_DIR}/.sprint-context"
[ -f "$SIGNAL_FILE" ] && source "$SIGNAL_FILE"
[ -f "$CONTEXT_FILE" ] && source "$CONTEXT_FILE"  # 동일 변수명이면 덮어씀
```

**Step 4a: Review**
```bash
git log --oneline master..sprint/$N
git diff --stat master...sprint/$N
```

**Step 4b: PR 생성 + Approve + Squash Merge**
```bash
# Push
git push -u origin sprint/$N

# PR 생성
gh pr create --base master --head "sprint/$N" \
  --title "feat: Sprint $N — $F_ITEMS" \
  --body "## Sprint $N\n$F_ITEMS\n\n$(git log --oneline master..sprint/$N)"

# Self-approve (브랜치 보호 정책)
PR_NUM=$(gh pr list --head "sprint/$N" --json number --jq '.[0].number')
gh pr review $PR_NUM --approve --body "✅ Sprint $N autopilot 완료"

# Squash merge
gh pr merge $PR_NUM --squash --delete-branch
```

**Step 4c: 로컬 동기화**
```bash
git pull origin master
```

**Step 4d: SPEC 갱신**
- F-item 상태 🔧 → ✅
- Match Rate 기록 (signal에서 읽기)

**Step 4e: Worktree 정리**
```bash
git worktree remove "$WT_DIR"
git branch -d "sprint/$N"
tmux kill-session -t "sprint-${PROJECT}-${N}" 2>/dev/null
rm -f "/tmp/sprint-signals/${PROJECT}-${N}.signal"
```

**Step 4f: 완료 보고**
```
## Sprint $N 완료

| 항목 | 결과 |
|------|------|
| F-items | $F_ITEMS |
| PR | #$PR_NUM (merged) |
| Match Rate | $MATCH_RATE |
| 소요 | $ELAPSED_MIN분 |
| SPEC | ✅ 갱신 완료 |
| WT | ✅ 정리 완료 |
```

### 5. 에러 처리

- **tmux 세션 없음**: `.sprint-context`에서 CHECKPOINT 확인 → `session-end`이면 DONE 처리, 아니면 FAILED
- **PR 이미 merge됨**: `gh pr view`로 확인 → MERGED 상태이면 로컬 동기화+정리만 수행
- **PR merge 실패**: CI 실패 등 → 사용자에게 수동 처리 요청
- **타임아웃 (3시간)**: 강제 종료하지 않고 사용자에게 알림

## 구현 방식

이 스킬은 Claude Code 세션 내에서 **Bash sleep 루프**로 동작한다:

```bash
# 핵심 루프 패턴 — 2-source 감지 (signal + sprint-context)
SIGNAL_FILE="/tmp/sprint-signals/${PROJECT}-${N}.signal"
CONTEXT_FILE="${WT_DIR}/.sprint-context"
MAX_WAIT=10800  # 3시간
INTERVAL=45
ELAPSED=0
LAST_CHECKPOINT=""

while [ $ELAPSED -lt $MAX_WAIT ]; do
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
  
  # 2-source 읽기: signal 먼저, sprint-context 폴백
  STATUS="" CHECKPOINT="" MATCH_RATE="" ERROR_MSG="" PR_NUM=""
  [ -f "$SIGNAL_FILE" ] && source "$SIGNAL_FILE"
  # sprint-context가 더 진행된 상태이면 덮어씀
  if [ -f "$CONTEXT_FILE" ]; then
    CTX_CHECKPOINT=$(grep "^CHECKPOINT=" "$CONTEXT_FILE" 2>/dev/null | cut -d= -f2)
    CTX_MATCH=$(grep "^MATCH_RATE=" "$CONTEXT_FILE" 2>/dev/null | cut -d= -f2)
    CTX_PR=$(grep "^PR_NUM=" "$CONTEXT_FILE" 2>/dev/null | cut -d= -f2)
    [ -n "$CTX_CHECKPOINT" ] && CHECKPOINT="$CTX_CHECKPOINT"
    [ -n "$CTX_MATCH" ] && MATCH_RATE="$CTX_MATCH"
    [ -n "$CTX_PR" ] && PR_NUM="$CTX_PR"
    # session-end checkpoint = DONE
    [ "$CTX_CHECKPOINT" = "session-end" ] && STATUS="DONE"
  fi
  
  # tmux 세션 소실 시 sprint-context로 판정
  if ! tmux has-session -t "sprint-${PROJECT}-${N}" 2>/dev/null; then
    if [ "$STATUS" = "DONE" ] || [ "$CHECKPOINT" = "session-end" ]; then
      echo "DONE"
      break
    fi
    # PR이 이미 merge되었는지 확인
    if [ -n "$PR_NUM" ]; then
      PR_STATE=$(gh pr view "$PR_NUM" --json state --jq '.state' 2>/dev/null)
      [ "$PR_STATE" = "MERGED" ] && { echo "DONE"; break; }
    fi
    echo "FAILED: tmux session lost, CHECKPOINT=$CHECKPOINT"
    break
  fi
  
  # 상태 분기
  case "$STATUS" in
    DONE)    echo "DONE"; break ;;
    FAILED)  echo "FAILED: $ERROR_MSG"; break ;;
    *)
      if [ "$CHECKPOINT" != "$LAST_CHECKPOINT" ] && [ -n "$CHECKPOINT" ]; then
        echo "PROGRESS: $CHECKPOINT"
        LAST_CHECKPOINT="$CHECKPOINT"
      fi
      ;;
  esac
done
```

Claude는 sleep 루프의 출력을 읽어 상태 변화를 감지하고, DONE/FAILED 시 적절한 후속 동작을 수행한다.

## Gotchas

- **sleep 중 Master 세션 차단**: 이 스킬 실행 중에는 Master에서 다른 작업 불가. 다른 작업이 필요하면 background monitor(`sprint-merge-monitor.sh`)를 사용
- **2-source 감지 필수 (S203 교훈)**: autopilot 구현에 따라 signal 파일 또는 `.sprint-context`에 상태를 기록함. 반드시 양쪽 모두 확인. signal만 폴링하면 DONE을 놓칠 수 있음
- **tmux 세션 소실 ≠ 실패**: autopilot이 session-end까지 완료하면 tmux 세션이 정상 종료됨. tmux 없을 때 `.sprint-context`의 CHECKPOINT=session-end 또는 PR MERGED 상태를 확인하여 DONE 판정
- **PR 이미 merge된 경우**: autopilot이 자체적으로 PR 생성+merge까지 완료하는 경우가 있음. Merge Pipeline 진입 전 `gh pr view`로 상태 확인 → MERGED이면 로컬 동기화+정리만 수행
- **ccs --model sonnet**: WT가 Sonnet으로 실행 중인지 이 스킬이 검증하지 않음. `/ax:sprint start`에서 보장
- **동시 Sprint**: 여러 Sprint를 동시에 watch할 수 없음. 하나씩 순차 처리
