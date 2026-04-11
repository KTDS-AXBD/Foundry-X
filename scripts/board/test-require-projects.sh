#!/usr/bin/env bash
# scripts/board/test-require-projects.sh — C25
#
# board::classify_projects_auth() preflight 분류 유닛 테스트.
# gh CLI 호출 없이 순수 함수 레벨로 검증 + gh stub 경유 통합 시나리오 1건.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_common.sh
source "$SCRIPT_DIR/_common.sh"
# _common.sh enables -e; tests explicitly inspect non-zero return codes.
set +e

FAIL=0
pass() { echo "  ✓ $1"; }
fail() { echo "  ✗ $1" >&2; FAIL=$((FAIL + 1)); }

echo "== board::classify_projects_auth() =="

# 1) OK — login, scope 있음
STATUS=$'Logged in to github.com as alice\n  Token scopes: gist, read:org, repo, read:project'
if ERR=$(board::classify_projects_auth "$STATUS" "" "login" 2>&1); rc=$?; [ "$rc" -eq 0 ] && [ -z "$ERR" ]; then
  pass "login + read:project → rc=0, no stderr"
else
  fail "login + read:project: rc=$rc, err='$ERR'"
fi

# 2) login 인증 상태지만 scope 부족 → rc=4, refresh 안내
STATUS=$'Logged in to github.com as alice\n  Token scopes: gist, read:org, repo'
ERR=$(board::classify_projects_auth "$STATUS" "" "login" 2>&1); rc=$?
if [ "$rc" -eq 4 ] && echo "$ERR" | grep -q "gh auth refresh -s read:project,project"; then
  pass "login no scope → rc=4 + refresh hint"
else
  fail "login no scope expected rc=4+refresh, got rc=$rc err='$ERR'"
fi

# 3) env 토큰 사용 중 scope 부족 → rc=3, PAT 재발급 안내 포함
STATUS=$'Logged in to github.com using the token in GH_TOKEN\n  Token scopes: repo'
ERR=$(board::classify_projects_auth "$STATUS" "ghp_abc123" "env" 2>&1); rc=$?
if [ "$rc" -eq 3 ] \
   && echo "$ERR" | grep -q "환경변수 토큰" \
   && echo "$ERR" | grep -q "PAT 재발급"; then
  pass "env token no scope → rc=3 + PAT 재발급 안내"
else
  fail "env token no scope expected rc=3+env msg, got rc=$rc err='$ERR'"
fi

# 4) 빈 GH_TOKEN — 핵심 시나리오 (empty env token)
ERR=$(board::classify_projects_auth "" "" "env" 2>&1); rc=$?
if [ "$rc" -eq 2 ] \
   && echo "$ERR" | grep -q "빈 값으로 설정" \
   && echo "$ERR" | grep -q "unset GH_TOKEN"; then
  pass "empty GH_TOKEN → rc=2 + unset 안내"
else
  fail "empty GH_TOKEN expected rc=2+unset msg, got rc=$rc err='$ERR'"
fi

# 5) 미인증 (gh auth login 안 한 상태)
STATUS="You are not logged into any GitHub hosts. To log in, run: gh auth login"
ERR=$(board::classify_projects_auth "$STATUS" "" "login" 2>&1); rc=$?
if [ "$rc" -eq 5 ] && echo "$ERR" | grep -q "gh auth login -s read:project,project"; then
  pass "미인증 → rc=5 + login 안내"
else
  fail "미인증 expected rc=5+login msg, got rc=$rc err='$ERR'"
fi

# 6) 통합 — require_projects() with fake gh stub: login+no scope → exit 4
echo "== board::require_projects() (gh stub) =="
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
cat > "$TMP/gh" <<'STUB'
#!/usr/bin/env bash
if [ "${1:-}" = "auth" ] && [ "${2:-}" = "status" ]; then
  cat <<'EOF'
github.com
  Logged in to github.com as alice
  Token scopes: gist, read:org, repo
EOF
  exit 0
fi
exit 0
STUB
chmod +x "$TMP/gh"
# jq도 필요 — 실제 jq 경유
cat > "$TMP/jq" <<'STUB'
#!/usr/bin/env bash
exec /usr/bin/jq "$@" 2>/dev/null || exec jq "$@"
STUB
chmod +x "$TMP/jq"

# sub-shell에서 PATH 교체, GH_TOKEN/GITHUB_TOKEN 환경 제거
OUT=$(
  unset GH_TOKEN GITHUB_TOKEN
  PATH="$TMP:$PATH" bash -c "source '$SCRIPT_DIR/_common.sh'; board::require_projects" 2>&1
)
rc=$?
if [ "$rc" -eq 4 ] && echo "$OUT" | grep -q "gh auth refresh -s read:project,project"; then
  pass "require_projects() + login-no-scope stub → exit 4 + refresh hint"
else
  fail "require_projects() stub: rc=$rc out='$OUT'"
fi

# 7) 통합 — empty GH_TOKEN 환경에서 require_projects() → exit 2
OUT=$(
  GH_TOKEN="" PATH="$TMP:$PATH" bash -c "source '$SCRIPT_DIR/_common.sh'; board::require_projects" 2>&1
)
rc=$?
if [ "$rc" -eq 2 ] && echo "$OUT" | grep -q "빈 값으로 설정"; then
  pass "require_projects() + GH_TOKEN=\"\" → exit 2 + unset 안내"
else
  fail "require_projects() empty GH_TOKEN: rc=$rc out='$OUT'"
fi

echo
if [ "$FAIL" -eq 0 ]; then
  echo "== ALL TESTS PASSED =="
  exit 0
else
  echo "== $FAIL TEST(S) FAILED ==" >&2
  exit 1
fi
