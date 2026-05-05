---
name: rename
description: "현재 tmux pane의 작업 제목을 자동 추출해서 tmux session 이름 변경. Sprint signal / Statusline file / SPEC.md F-item / 인자 우선순위로 추출. Use when: rename, /rename, session 이름 변경, pane 제목 갱신. Triggers: rename, 세션 이름, 탭 제목, pane title, 이름 바꿔"
user-invocable: true
category: tmux
argument-hint: "[제목] — 생략 시 자동 추출"
---

# /rename — Pane 작업 제목 → tmux Session 이름 자동 갱신

현재 tmux pane의 작업 컨텍스트를 4단계 우선순위로 추출해서 의미있는 session/window 이름으로 변경한다.

## 사용 예

```bash
/rename                          # 자동 추출 (signal → statusline → F-item)
/rename "MSA 룰 교정"             # 명시적 제목
/rename Sprint 343 review        # 따옴표 없이도 가능
```

## 추출 우선순위 (4단계 fallback)

| 순서 | 출처 | 조건 |
|------|------|------|
| 1 | **인자** (`$*`) | 사용자가 명시 제공 |
| 2 | **Sprint signal + SPEC F-item** | cwd가 `worktrees/{project}/sprint-N/` 안 |
| 3 | **Statusline file** | `/tmp/claude-req-pane${PANE_ID}` 존재 |
| 4 | **AskUserQuestion fallback** | 위 모두 실패 시 사용자에게 직접 입력 받기 |

## 실행 절차 (Claude가 따라 실행)

### Step 1: 환경 확인 + 가드

TMUX 환경 외에서는 `❌ TMUX 미설정 — rename 불가` 출력 후 종료.

```bash
[ -z "$TMUX" ] && { echo "❌ TMUX 미설정 — rename 불가"; exit 1; }
PANE_ID="${TMUX_PANE#%}"
SESSION=$(tmux display -p '#{session_name}')
WINDOW=$(tmux display -p '#{window_index}')
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
```

### Step 2: 작업 제목 추출 (우선순위 fallback)

```bash
TITLE=""
SOURCE=""

# 2a. 인자
if [ "$#" -gt 0 ]; then
  TITLE="$*"
  SOURCE="argument"
fi

# 2b. Sprint signal + SPEC F-item
if [ -z "$TITLE" ] && [[ "$(pwd)" =~ /worktrees/([^/]+)/sprint-([0-9]+) ]]; then
  PROJ="${BASH_REMATCH[1]}"
  SNUM="${BASH_REMATCH[2]}"
  SIGNAL="/tmp/sprint-signals/${PROJ}-${SNUM}.signal"
  if [ -f "$SIGNAL" ]; then
    F_ITEMS=$(grep "^F_ITEMS=" "$SIGNAL" | cut -d= -f2)
    if [ -n "$F_ITEMS" ] && [ -f "$PROJECT_ROOT/SPEC.md" ]; then
      F_TITLE=$(grep -E "^\| ${F_ITEMS} \|" "$PROJECT_ROOT/SPEC.md" \
        | sed -E 's/^\| [^|]+\| \*\*([^*]+)\*\*.*$/\1/' \
        | head -1 | head -c 60)
      [ -n "$F_TITLE" ] && TITLE="S${SNUM} ${F_ITEMS} — ${F_TITLE}" && SOURCE="signal+SPEC"
    fi
    [ -z "$TITLE" ] && TITLE="Sprint ${SNUM}" && SOURCE="signal-only"
  fi
fi

# 2c. Statusline file
if [ -z "$TITLE" ] && [ -f "/tmp/claude-req-pane${PANE_ID}" ]; then
  TITLE=$(cat "/tmp/claude-req-pane${PANE_ID}")
  SOURCE="statusline"
fi
```

### Step 3: AskUserQuestion fallback (Title 빈 경우만)

자동 추출 실패 시:

```
AskUserQuestion(
  question: "Session 이름을 무엇으로 변경할까요? 자동 추출 결과 빈 값이에요.",
  options: [
    {label: "현재 디렉토리명 + git branch", description: "{basename}@{branch}"},
    {label: "최근 git commit subject", description: "git log -1의 첫 줄"},
    {label: "직접 입력", description: "Other 선택 후 자유 입력"}
  ]
)
```

선택지에 따라 TITLE 구성. Source = `interactive`.

### Step 4: 안전화 + 충돌 방지

```bash
# 위험 특수문자만 제거 (denylist 방식 — POSIX bracket + 한글 collation 충돌 회피)
# 제거 대상: tmux session 이름에 문제되는 문자 ( * : ( ) [ ] \ / )
# 유지: 한글, 영숫자, 공백, +, _, -, ., 그 외 일반 기호
SAFE_TITLE=$(echo "$TITLE" \
  | sed 's/[*:()[]\\/]//g' \
  | tr -s ' ' \
  | sed 's/^ *//;s/ *$//' \
  | head -c 80)

# 동일 이름 session이 존재하면 (현재 session 제외) suffix 추가
if [ "$SAFE_TITLE" != "$SESSION" ] && tmux has-session -t "$SAFE_TITLE" 2>/dev/null; then
  SAFE_TITLE="${SAFE_TITLE} (${PANE_ID})"
fi
```

> **주의**: `sed 's/[^[:alnum:]가-힣 ._-]//g'` 같은 POSIX bracket + 한글 범위 + literal char 조합은 일부 로케일에서 `Invalid collation character` 에러 발생. **denylist 방식**(제거할 문자만 명시) 또는 `LC_ALL=C` 강제가 안전.

### Step 5: tmux rename 실행

```bash
tmux rename-session -t "$SESSION" "$SAFE_TITLE"
tmux rename-window -t "${SAFE_TITLE}:${WINDOW}" "$(echo "$SAFE_TITLE" | head -c 50)"
echo "✅ Session renamed: '$SESSION' → '$SAFE_TITLE' (source=$SOURCE)"
```

### Step 6: 보고

| 항목 | 보고 형식 |
|------|----------|
| 변경 전 → 변경 후 | `'sprint-343 F609 ...' → 'S343 F609 — MSA 룰 교정 Pass 2'` |
| 출처 | `argument` / `signal+SPEC` / `signal-only` / `statusline` / `interactive` |
| 안전화 결과 | 특수문자 제거된 부분이 있으면 명시 |
| 충돌 처리 | suffix 추가됐으면 명시 |

## 자동 호출 패턴

`bashrc sprint()` 또는 `wt-claude-worktree.sh`가 WT 생성 시 자동 주입할 수 있음. 단 sprint 가동은 이미 `wt-claude-worktree.sh`에서 의미있는 이름 부여하므로, /rename은 **수동 갱신용** 또는 **ad-hoc pane용**.

## Limitations

- TMUX 외 환경 작동 불가 (`$TMUX` 가드)
- session 이름 80자 제한 (tmux 표준)
- 위험 특수문자 `*` `:` `(` `)` `[` `]` `\` `/` 만 제거 (denylist), 한글 + 영숫자 + `+` `_` `-` `.` 등 유지
- worktree 안이 아니면 priority 2 (signal) 건너뜀
- SPEC.md F-item 행 형식이 `| F### | **제목**` 패턴 가정 (Foundry-X 표준)
- POSIX bracket + 한글 + literal char 조합 sed는 로케일에 따라 collation 에러 — denylist 방식 사용 (S332 버그 fix)

## 테스트 시나리오

| 케이스 | 입력 | 기대 결과 |
|--------|------|----------|
| WT pane + signal 존재 | `/rename` (cwd=worktrees/Foundry-X/sprint-343) | `S343 F609 — MSA 룰 강제 교정 Pass 2` |
| 인자 명시 | `/rename "테스트 세션"` | `테스트 세션` |
| Master pane + statusline | `/rename` (`/tmp/claude-req-pane61` 존재) | statusline 파일 내용 |
| Fallback | `/rename` (모두 부재) | AskUserQuestion 선택지 |
| TMUX 외 | `/rename ...` | `❌ TMUX 미설정` |
| 동일 이름 session 충돌 | `/rename existing-name` | `existing-name (61)` suffix 추가 |
