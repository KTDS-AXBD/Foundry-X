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
