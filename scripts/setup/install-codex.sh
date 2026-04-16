#!/usr/bin/env bash
# F550: Codex CLI 설치 + 버전 pin + 환경 검증
# F554: user-level npm prefix 재작성 (sudo 제거 + EACCES 방지)
# Sprint 300/302 | FX-REQ-587/591
set -euo pipefail

CODEX_VERSION="@openai/codex@0.120.0"
NPM_GLOBAL_PREFIX="$HOME/.npm-global"
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

# user-level npm prefix 설정 (EACCES 방지, sudo 불필요)
setup_user_prefix() {
  local current_prefix
  current_prefix=$(npm config get prefix 2>/dev/null || echo "")
  if [ "$current_prefix" != "$NPM_GLOBAL_PREFIX" ]; then
    log "npm prefix 설정: $NPM_GLOBAL_PREFIX"
    npm config set prefix "$NPM_GLOBAL_PREFIX"
  else
    log "npm prefix 이미 user-level: $NPM_GLOBAL_PREFIX"
  fi
  mkdir -p "$NPM_GLOBAL_PREFIX/bin"

  # PATH에 없으면 안내 (현재 셸 세션용)
  if ! echo "$PATH" | grep -q "$NPM_GLOBAL_PREFIX/bin"; then
    log "⚠️  PATH 추가 필요: export PATH=\"$NPM_GLOBAL_PREFIX/bin:\$PATH\""
    log "   → ~/.bashrc에 추가 권장 (1회):"
    log "   echo 'export PATH=\"$NPM_GLOBAL_PREFIX/bin:\$PATH\"' >> ~/.bashrc"
    export PATH="$NPM_GLOBAL_PREFIX/bin:$PATH"
  fi
}

# bashrc에 PATH 추가 (중복 방지)
ensure_bashrc_path() {
  local bashrc="$HOME/.bashrc"
  local entry="export PATH=\"$NPM_GLOBAL_PREFIX/bin:\$PATH\""
  if ! grep -qF "$NPM_GLOBAL_PREFIX/bin" "$bashrc" 2>/dev/null; then
    echo "" >> "$bashrc"
    echo "# Codex CLI (user-level npm prefix)" >> "$bashrc"
    echo "$entry" >> "$bashrc"
    log "✅ ~/.bashrc에 PATH 추가 완료"
  else
    log "ℹ️  ~/.bashrc PATH 이미 설정됨"
  fi
}

# 현재 Codex 버전 확인
check_current() {
  local codex_bin="$NPM_GLOBAL_PREFIX/bin/codex"
  if command -v codex &>/dev/null || [ -x "$codex_bin" ]; then
    local ver
    ver=$(codex --version 2>/dev/null || "$codex_bin" --version 2>/dev/null || echo "unknown")
    log "현재 Codex: $ver"
    return 0
  else
    log "Codex 미설치"
    return 1
  fi
}

# user prefix 기반 npm 전역 설치 (sudo 없이)
install() {
  log "user-level prefix: $NPM_GLOBAL_PREFIX"
  log "설치 중: npm install -g $CODEX_VERSION"
  npm install -g "$CODEX_VERSION"
  log "✅ 설치 완료"
}

# OPENAI_API_KEY / OpenRouter 환경변수 안내
check_env() {
  if [ -z "${OPENAI_API_KEY:-}" ]; then
    log "⚠️  OPENAI_API_KEY 미설정"
    log "   → 'codex login' 또는 export OPENAI_API_KEY=sk-... 필요"
    log "   → 가이드: $REPO_ROOT/docs/guides/codex-setup.md"
  else
    log "✅ OPENAI_API_KEY 설정됨"
  fi

  # OpenRouter base_url 오버라이드 검증
  local config_file="$HOME/.config/codex/config.toml"
  if [ -f "$config_file" ] && grep -qi "openrouter" "$config_file" 2>/dev/null; then
    log "✅ OpenRouter base_url 설정 감지됨 ($config_file)"
  else
    log "ℹ️  OpenRouter 미설정 (OpenAI 직접 키 모드)"
    log "   → OpenRouter 사용 시: $config_file 에 base_url 추가"
  fi
}

main() {
  log "=== Codex CLI 설치 (버전 pin: $CODEX_VERSION) ==="
  log "npm prefix: $NPM_GLOBAL_PREFIX (user-level, sudo 불필요)"

  if $DRY_RUN; then
    log "[dry-run 모드] 설치 건너뜀"
    log "현재 npm prefix: $(npm config get prefix 2>/dev/null || echo 'unknown')"
    check_current || true
    check_env
    log "dry-run 완료"
    return 0
  fi

  setup_user_prefix
  ensure_bashrc_path

  # 이미 올바른 버전이면 스킵
  if check_current; then
    log "이미 설치됨 — 업데이트 여부 확인 중..."
  fi

  install
  check_env

  log ""
  log "다음 단계:"
  log "  1. source ~/.bashrc  (새 탭에서 PATH 적용)"
  log "  2. codex login  (OpenAI OAuth, 1회)"
  log "  3. codex --help 로 동작 확인"
  log "  4. 가이드: $REPO_ROOT/docs/guides/codex-setup.md"
}

main "$@"
