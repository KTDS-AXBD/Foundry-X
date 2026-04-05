#!/bin/bash
# PreToolUse hook: git 위험 명령 차단
# 차단 대상: --no-verify, git add ., git push --force, git reset --hard

INPUT="$CLAUDE_TOOL_INPUT"

# --no-verify 차단 (git commit, git push 등 어디에서든)
if echo "$INPUT" | grep -qE -- '--no-verify'; then
  echo "BLOCKED: --no-verify는 프로젝트 정책으로 차단됨 — hook 실패 시 원인을 해결하세요"
  exit 2
fi

# git add . 차단 (git add 뒤에 . 또는 -A 또는 --all)
if echo "$INPUT" | grep -qE 'git\s+add\s+(-A|--all|\.(\s|"|$))'; then
  echo "BLOCKED: 'git add .'은 금지 — 파일을 개별 지정하세요 (멀티 pane 사고 방지)"
  exit 2
fi

# git push --force 차단 (--force-with-lease 포함)
if echo "$INPUT" | grep -qE 'git\s+push\s+.*--force'; then
  echo "BLOCKED: force push는 프로젝트 정책으로 차단됨 — Linear history 보호"
  exit 2
fi

# git reset --hard 차단
if echo "$INPUT" | grep -qE 'git\s+reset\s+--hard'; then
  echo "BLOCKED: git reset --hard는 프로젝트 정책으로 차단됨 — 데이터 손실 위험"
  exit 2
fi

exit 0
