#!/usr/bin/env bash
# TDD Red — F550: install-codex.sh + codex-reviewer profile 존재 검증
# Sprint 300 | FX-REQ-587
set -euo pipefail

PASS=0
FAIL=0
REPO_ROOT="$(git rev-parse --show-toplevel)"

ok() { echo "  ✅ $1"; PASS=$((PASS+1)); }
fail() { echo "  ❌ $1"; FAIL=$((FAIL+1)); }

echo "=== F550 install-codex 테스트 ==="

# T1: 설치 스크립트 존재
if [ -f "$REPO_ROOT/scripts/setup/install-codex.sh" ]; then
  ok "T1: install-codex.sh 존재"
else
  fail "T1: install-codex.sh 없음"
fi

# T2: 설치 스크립트 실행 가능
if [ -x "$REPO_ROOT/scripts/setup/install-codex.sh" ]; then
  ok "T2: install-codex.sh 실행 가능 (chmod +x)"
else
  fail "T2: install-codex.sh 실행 불가"
fi

# T3: 버전 pin 문자열 포함 (@openai/codex@)
if grep -q '@openai/codex@' "$REPO_ROOT/scripts/setup/install-codex.sh" 2>/dev/null; then
  ok "T3: 버전 pin 포함 (@openai/codex@)"
else
  fail "T3: 버전 pin 없음"
fi

# T4: --dry-run 플래그 지원 (설치 없이 검증 가능)
if grep -q 'dry.run\|DRY_RUN\|dry_run' "$REPO_ROOT/scripts/setup/install-codex.sh" 2>/dev/null; then
  ok "T4: --dry-run 플래그 지원"
else
  fail "T4: --dry-run 미지원"
fi

# T5: 리뷰어 프로파일 문서 존재
PROFILE="$REPO_ROOT/docs/guides/codex-reviewer-profile.md"
if [ -f "$PROFILE" ]; then
  ok "T5: codex-reviewer-profile.md 존재"
else
  fail "T5: codex-reviewer-profile.md 없음 (경로: $PROFILE)"
fi

# T6: 프로파일에 read-only 제약 섹션 존재
if grep -qi 'forbidden\|read.only\|금지' "$PROFILE" 2>/dev/null; then
  ok "T6: 프로파일에 read-only 제약 명시"
else
  fail "T6: 프로파일에 read-only 제약 없음"
fi

# T7: codex-setup.md 가이드 존재
if [ -f "$REPO_ROOT/docs/guides/codex-setup.md" ]; then
  ok "T7: codex-setup.md 가이드 존재"
else
  fail "T7: codex-setup.md 없음"
fi

# === F554 추가 테스트 (Sprint 302 hotfix) ===
echo ""
echo "=== F554 install-codex 추가 테스트 (user-level prefix) ==="

# T8: user-level npm prefix 설정 포함 (EACCES 방지)
if grep -q 'npm-global\|npm config set prefix' "$REPO_ROOT/scripts/setup/install-codex.sh" 2>/dev/null; then
  ok "T8: user-level npm prefix 설정 포함"
else
  fail "T8: user-level npm prefix 미설정 (EACCES 발생 가능)"
fi

# T9: sudo 명령 실행 없음 (주석·문자열 제외, 실제 sudo 명령 호출 탐지)
# 패턴: 줄 앞 또는 공백 후 sudo가 명령으로 오는 경우 (예: "sudo npm", "  sudo install")
if grep -v '^[[:space:]]*#' "$REPO_ROOT/scripts/setup/install-codex.sh" 2>/dev/null | \
   grep -qP '(?<!["\x27])\bsudo\b(?=\s+[a-z])'; then
  fail "T9: sudo 명령 실행 발견 (user prefix 방식과 불일치)"
else
  ok "T9: sudo 명령 실행 없음 (user prefix 방식)"
fi

# T10: --dry-run 실행 시 prefix 관련 출력 확인
DRY_OUT=$(bash "$REPO_ROOT/scripts/setup/install-codex.sh" --dry-run 2>&1 || true)
if echo "$DRY_OUT" | grep -qi 'prefix\|npm-global\|dry.run'; then
  ok "T10: --dry-run 실행 시 prefix/dry-run 메시지 출력"
else
  fail "T10: --dry-run 출력에 prefix 정보 없음"
fi

echo ""
echo "결과: PASS=$PASS FAIL=$FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo "🔴 RED — 구현 필요 ($FAIL개 항목)"
  exit 1
else
  echo "🟢 GREEN — 모든 테스트 통과"
  exit 0
fi
