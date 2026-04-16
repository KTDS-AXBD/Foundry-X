#!/usr/bin/env bash
# F550: Codex CLI 설치 + 버전 pin + 환경 검증
# Sprint 300 | FX-REQ-587
set -euo pipefail

CODEX_VERSION="@openai/codex@0.120.0"
DRY_RUN=false
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

usage() {
  echo "Usage: $0 [--dry-run]"
  echo "  --dry-run   설치 없이 현재 상태만 검증"
}

for arg in "$@"; do
  case "$arg" in
    --dry-run|--DRY_RUN) DRY_RUN=true ;;
    -h|--help) usage; exit 0 ;;
  esac
done

log() { echo "[install-codex] $*"; }

# 현재 Codex 버전 확인
check_current() {
  if command -v codex &>/dev/null; then
    local ver
    ver=$(codex --version 2>/dev/null || echo "unknown")
    log "현재 Codex: $ver"
    return 0
  else
    log "Codex 미설치"
    return 1
  fi
}

# npm 전역 설치
install() {
  log "설치 중: npm install -g $CODEX_VERSION"
  npm install -g "$CODEX_VERSION"
  log "✅ 설치 완료"
}

# OPENAI_API_KEY 환경변수 안내
check_env() {
  if [ -z "${OPENAI_API_KEY:-}" ]; then
    log "⚠️  OPENAI_API_KEY 미설정"
    log "   → 'codex login' 또는 export OPENAI_API_KEY=sk-... 필요"
    log "   → 가이드: $REPO_ROOT/docs/guides/codex-setup.md"
  else
    log "✅ OPENAI_API_KEY 설정됨"
  fi
}

main() {
  log "=== Codex CLI 설치 (버전 pin: $CODEX_VERSION) ==="

  if $DRY_RUN; then
    log "[dry-run 모드] 설치 건너뜀"
    check_current || true
    check_env
    log "dry-run 완료"
    return 0
  fi

  # 이미 올바른 버전이면 스킵
  if check_current; then
    log "이미 설치됨 — 업데이트 여부 확인 중..."
  fi

  install
  check_env

  log ""
  log "다음 단계:"
  log "  1. codex login  (OpenAI OAuth, 1회)"
  log "  2. codex --help 로 동작 확인"
  log "  3. 가이드: $REPO_ROOT/docs/guides/codex-setup.md"
}

main "$@"
