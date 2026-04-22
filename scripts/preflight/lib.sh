#!/usr/bin/env bash
#
# Preflight Common Library (C97)
#
# scripts/preflight/ 테스트 파일에서 source로 공통 assertion 함수 사용.
# 인라인 복제 대신 DRY 원칙 적용.
#
# Usage:
#   source scripts/preflight/lib.sh
#   PASS_COUNT=0; FAIL_COUNT=0; TOTAL=0
#   assert_exit "label" 0 bash some-script.sh

assert_exit() {
  local label="$1"
  local expected_exit="$2"
  shift 2
  local actual_exit=0
  "$@" >/dev/null 2>&1 || actual_exit=$?
  ((TOTAL++))
  if [ "$actual_exit" -eq "$expected_exit" ]; then
    printf '\033[32m[PASS]\033[0m %s (exit %s)\n' "$label" "$actual_exit"
    ((PASS_COUNT++))
  else
    printf '\033[31m[FAIL]\033[0m %s — expected exit %s, got %s\n' "$label" "$expected_exit" "$actual_exit"
    ((FAIL_COUNT++))
  fi
}

assert_true() {
  local label="$1"
  shift
  local actual_exit=0
  "$@" >/dev/null 2>&1 || actual_exit=$?
  ((TOTAL++))
  if [ "$actual_exit" -eq 0 ]; then
    printf '\033[32m[PASS]\033[0m %s\n' "$label"
    ((PASS_COUNT++))
  else
    printf '\033[31m[FAIL]\033[0m %s\n' "$label"
    ((FAIL_COUNT++))
  fi
}

assert_output_contains() {
  local label="$1"
  local expected_text="$2"
  shift 2
  local output
  output=$("$@" 2>&1) || true
  ((TOTAL++))
  if echo "$output" | grep -q "$expected_text"; then
    printf '\033[32m[PASS]\033[0m %s (contains "%s")\n' "$label" "$expected_text"
    ((PASS_COUNT++))
  else
    printf '\033[31m[FAIL]\033[0m %s — missing "%s"\n' "$label" "$expected_text"
    printf '       actual head:\n'
    echo "$output" | head -5 | sed 's/^/         /'
    ((FAIL_COUNT++))
  fi
}

log_pass() { printf '\033[32m[PASS]\033[0m  %s\n' "$*"; }
log_fail() { printf '\033[31m[FAIL]\033[0m  %s\n' "$*"; }
log_warn() { printf '\033[33m[WARN]\033[0m  %s\n' "$*"; }
log_info() { printf '\033[36m[INFO]\033[0m  %s\n' "$*"; }

print_summary() {
  local pass="${1:-$PASS_COUNT}"
  local fail="${2:-$FAIL_COUNT}"
  local total="${3:-$TOTAL}"
  echo ""
  echo "════════════════════════════════════════════════════════════"
  printf "  결과: PASS=%s / FAIL=%s / TOTAL=%s\n" "$pass" "$fail" "$total"
  echo "════════════════════════════════════════════════════════════"
}
