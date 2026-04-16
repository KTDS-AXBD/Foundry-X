#!/usr/bin/env bash
# F551: Sprint PR → Codex 리뷰 → JSON 저장
# Sprint 300 | FX-REQ-588
set -euo pipefail

SPRINT_NUM="${SPRINT_NUM:-}"
DRY_RUN=false
MOCK_CODEX="${MOCK_CODEX:-0}"
REPO_ROOT="$(git rev-parse --show-toplevel)"

for arg in "$@"; do
  case "$arg" in
    --sprint) shift; SPRINT_NUM="${1:-}" ;;
    --sprint=*) SPRINT_NUM="${arg#--sprint=}" ;;
    --dry-run) DRY_RUN=true ;;
  esac
done

if [ -z "$SPRINT_NUM" ]; then
  # .sprint-context에서 읽기
  if [ -f "$REPO_ROOT/.sprint-context" ]; then
    SPRINT_NUM=$(grep "^SPRINT_NUM=" "$REPO_ROOT/.sprint-context" | cut -d= -f2)
  fi
fi

if [ -z "$SPRINT_NUM" ]; then
  echo "❌ SPRINT_NUM 필요 (--sprint N 또는 .sprint-context)" >&2
  exit 1
fi

REVIEW_DIR="$REPO_ROOT/.claude/reviews/sprint-${SPRINT_NUM}"
OUTPUT_JSON="$REVIEW_DIR/codex-review.json"
PRD_PATH="${PRD_PATH:-docs/specs/fx-codex-integration/prd-final.md}"
PROFILE="$HOME/.claude-squad/profiles/codex-reviewer.md"
TIMESTAMP=$(date -Iseconds)

log() { echo "[codex-review] $*"; }

mkdir -p "$REVIEW_DIR"

# Degraded 모드: Codex 미사용 시 fallback JSON 생성
write_degraded_json() {
  local reason="${1:-codex_unavailable}"
  cat > "$OUTPUT_JSON" << ENDJSON
{
  "verdict": "PASS-degraded",
  "prd_coverage": { "covered": [], "missing": [] },
  "phase_exit_checklist": { "D1": "SKIP", "D2": "SKIP", "D3": "SKIP", "D4": "SKIP" },
  "code_issues": [],
  "over_engineering": [],
  "divergence_score": 0.0,
  "model": "none",
  "timestamp": "${TIMESTAMP}",
  "degraded": true,
  "degraded_reason": "${reason}",
  "summary_ko": "Codex 리뷰 건너뜀 (${reason}). Claude 단독 결과로 진행."
}
ENDJSON
  log "⚠️  Degraded 모드 — $reason"
}

# Mock 모드 (테스트용)
write_mock_json() {
  cat > "$OUTPUT_JSON" << ENDJSON
{
  "verdict": "PASS",
  "prd_coverage": {
    "covered": ["FX-REQ-587", "FX-REQ-588"],
    "missing": []
  },
  "phase_exit_checklist": {
    "D1": "PASS",
    "D2": "PASS",
    "D3": "PASS",
    "D4": "PASS"
  },
  "code_issues": [],
  "over_engineering": [],
  "divergence_score": 0.0,
  "model": "mock",
  "timestamp": "${TIMESTAMP}",
  "degraded": false,
  "summary_ko": "Mock 리뷰 — 모든 항목 PASS (테스트 전용)"
}
ENDJSON
  log "🟡 Mock 모드 — codex-review.json 생성"
}

main() {
  log "Sprint $SPRINT_NUM 리뷰 시작"
  log "출력: $OUTPUT_JSON"

  # Mock 모드
  if [ "$MOCK_CODEX" = "1" ]; then
    write_mock_json
    return 0
  fi

  # Dry-run
  if $DRY_RUN; then
    log "[dry-run] Codex 호출 건너뜀"
    write_degraded_json "dry_run"
    return 0
  fi

  # Codex 설치 확인
  if ! command -v codex &>/dev/null; then
    log "⚠️  codex 미설치 — degraded 모드"
    write_degraded_json "codex_not_installed"
    return 0
  fi

  # OpenAI 키 확인
  if [ -z "${OPENAI_API_KEY:-}" ]; then
    log "⚠️  OPENAI_API_KEY 미설정 — degraded 모드"
    write_degraded_json "openai_key_missing"
    return 0
  fi

  # 프로파일 확인
  if [ ! -f "$PROFILE" ]; then
    log "⚠️  리뷰어 프로파일 없음 ($PROFILE) — degraded 모드"
    write_degraded_json "profile_missing"
    return 0
  fi

  # PR diff 수집
  local pr_diff=""
  pr_diff=$(git diff master..HEAD -- 'packages/**' 'scripts/**' 2>/dev/null | head -500 || echo "")

  # PRD 내용 수집
  local prd_content=""
  if [ -f "$REPO_ROOT/$PRD_PATH" ]; then
    prd_content=$(head -200 "$REPO_ROOT/$PRD_PATH" 2>/dev/null || echo "PRD not found")
  fi

  # 변경 파일 목록
  local changed_files=""
  changed_files=$(git diff --name-only master..HEAD 2>/dev/null || echo "")

  # Codex 프롬프트 구성
  local prompt
  prompt="$(cat "$PROFILE")

---
## Sprint $SPRINT_NUM PR Review Input

### PRD (excerpt)
\`\`\`
$prd_content
\`\`\`

### Changed Files
$changed_files

### Git Diff (first 500 lines)
\`\`\`diff
$pr_diff
\`\`\`

---
Please review this Sprint PR and output JSON only."

  # Codex 실행
  log "Codex 호출 중..."
  local codex_output=""
  codex_output=$(echo "$prompt" | timeout 120 codex exec --no-git --json 2>/dev/null || echo "")

  if [ -z "$codex_output" ]; then
    log "⚠️  Codex 응답 없음 — degraded 모드"
    write_degraded_json "codex_empty_response"
    return 0
  fi

  # JSON 검증
  if ! echo "$codex_output" | python3 -c "import json,sys; json.load(sys.stdin)" 2>/dev/null; then
    log "⚠️  Codex 응답이 유효한 JSON 아님 — degraded 모드"
    write_degraded_json "codex_invalid_json"
    return 0
  fi

  echo "$codex_output" > "$OUTPUT_JSON"
  local verdict
  verdict=$(python3 -c "import json; print(json.load(open('$OUTPUT_JSON')).get('verdict','unknown'))" 2>/dev/null || echo "unknown")
  log "✅ 완료 — verdict=$verdict"
}

main "$@"
