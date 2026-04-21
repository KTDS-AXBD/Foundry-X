#!/usr/bin/env bash
#
# D1 Binding Preflight (C90)
#
# S307 F561 사고(DISCOVERY_DB binding → prod D1 미존재 → code 10181) 재발 방지.
# deploy 전에 wrangler.toml에 선언된 [[d1_databases]] binding의
# Cloudflare D1 DB 실존 여부를 CF API로 검증한다.
#
# Usage:
#   bash scripts/preflight/check-d1-bindings.sh
#
# Env:
#   CF_API_TOKEN         — Cloudflare API token (또는 CLOUDFLARE_API_TOKEN)
#   CF_ACCOUNT_ID        — Cloudflare account ID (없으면 wrangler.toml에서 추출)
#   PACKAGES_DIR         — wrangler.toml 검색 루트 (default: packages)
#   CF_MOCK_RESP_DIR     — 테스트용: $DB_ID.json 파일에서 API 응답 읽기
#
# Exit code:
#   0 — 모든 D1 DB 존재 (또는 체크 대상 없음)
#   1 — 하나 이상 DB 미존재 또는 환경 오류
#   2 — Cloudflare API 인증 실패

set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

PACKAGES_DIR="${PACKAGES_DIR:-packages}"
CF_MOCK_RESP_DIR="${CF_MOCK_RESP_DIR:-}"

FAIL_COUNT=0
PASS_COUNT=0
SKIP_COUNT=0
AUTH_ERROR=false

log_pass() { printf '\033[32m[PASS]\033[0m  %s\n' "$*"; ((PASS_COUNT++)); }
log_fail() { printf '\033[31m[FAIL]\033[0m  %s\n' "$*"; ((FAIL_COUNT++)); }
log_skip() { printf '\033[33m[SKIP]\033[0m  %s\n' "$*"; ((SKIP_COUNT++)); }
log_info() { printf '\033[36m[INFO]\033[0m  %s\n' "$*"; }

resolve_token() {
  if [ -n "${CF_API_TOKEN:-}" ]; then
    echo "$CF_API_TOKEN"
  elif [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
    echo "$CLOUDFLARE_API_TOKEN"
  else
    echo ""
  fi
}

check_prerequisites() {
  local token
  token=$(resolve_token)

  if [ -z "$token" ]; then
    log_fail "CF_API_TOKEN (또는 CLOUDFLARE_API_TOKEN) 환경변수가 필요해요"
    exit 1
  fi

  if [ -z "$CF_MOCK_RESP_DIR" ] && ! command -v curl &>/dev/null; then
    log_fail "curl이 설치되지 않았어요"
    exit 1
  fi

  if ! command -v jq &>/dev/null; then
    log_fail "jq가 설치되지 않았어요"
    exit 1
  fi
}

resolve_account_id() {
  if [ -n "${CF_ACCOUNT_ID:-}" ]; then
    echo "$CF_ACCOUNT_ID"
    return
  fi
  local toml
  for toml in "$PACKAGES_DIR"/*/wrangler.toml; do
    [ -f "$toml" ] || continue
    local id
    id=$(grep -m1 '^account_id *= *"' "$toml" | sed 's/.*= *"\(.*\)"/\1/' || true)
    if [ -n "$id" ]; then
      echo "$id"
      return
    fi
  done
  echo ""
}

# Extract top-level [[d1_databases]] blocks only (not env.dev / env.production)
# Output format: "binding:database_name:database_id" (skips TBD)
parse_top_level_d1_blocks() {
  local toml_file="$1"
  awk '
    /^\[\[/ {
      if (in_block && db_id != "" && db_id != "TBD") {
        print binding ":" db_name ":" db_id
      }
      in_block = 0; binding = ""; db_name = ""; db_id = ""
    }
    /^\[\[d1_databases\]\]/ { in_block = 1; next }
    in_block {
      if (/^binding *= *"/) {
        val = $0; gsub(/.*= *"/, "", val); gsub(/".*/, "", val); binding = val
      }
      if (/^database_name *= *"/) {
        val = $0; gsub(/.*= *"/, "", val); gsub(/".*/, "", val); db_name = val
      }
      if (/^database_id *= *"/) {
        val = $0; gsub(/.*= *"/, "", val); gsub(/".*/, "", val); db_id = val
      }
    }
    END {
      if (in_block && db_id != "" && db_id != "TBD") {
        print binding ":" db_name ":" db_id
      }
    }
  ' "$toml_file"
}

# Call CF API or read from mock response dir
query_cf_api() {
  local db_id="$1"
  local account_id="$2"
  local token="$3"

  if [ -n "$CF_MOCK_RESP_DIR" ]; then
    local resp_file="$CF_MOCK_RESP_DIR/$db_id.json"
    if [ -f "$resp_file" ]; then
      cat "$resp_file"
    else
      echo '{"result":null,"success":false,"errors":[{"code":7003,"message":"Not Found"}]}'
    fi
    return
  fi

  curl -s -X GET \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    "https://api.cloudflare.com/client/v4/accounts/$account_id/d1/database/$db_id"
}

check_db() {
  local binding="$1"
  local db_name="$2"
  local db_id="$3"
  local account_id="$4"
  local token="$5"
  local source_pkg="$6"

  local short_id="${db_id:0:8}..."
  local label="[$db_name / $binding] ($short_id) ← $source_pkg"

  local response
  response=$(query_cf_api "$db_id" "$account_id" "$token")

  local err_code
  err_code=$(echo "$response" | jq -r '.errors[0].code // empty' 2>/dev/null || echo "")

  if [ "$err_code" = "10000" ]; then
    log_fail "$label — CF API 인증 실패 (code 10000)"
    AUTH_ERROR=true
    return 1
  fi

  local success
  success=$(echo "$response" | jq -r '.success' 2>/dev/null || echo "false")

  if [ "$success" = "true" ]; then
    log_pass "$label — D1 DB 존재 확인"
    return 0
  else
    local err_msg
    err_msg=$(echo "$response" | jq -r '.errors[0].message // "Unknown error"' 2>/dev/null || echo "Unknown error")
    log_fail "$label — DB 미존재 (database_id=$db_id): $err_msg"
    return 1
  fi
}

main() {
  echo "════════════════════════════════════════════════════════════"
  echo "  D1 Binding Preflight (C90)"
  echo "  Scanning: $PACKAGES_DIR/*/wrangler.toml"
  echo "════════════════════════════════════════════════════════════"
  echo ""

  check_prerequisites

  local token
  token=$(resolve_token)

  local account_id
  account_id=$(resolve_account_id)

  if [ -z "$account_id" ]; then
    log_fail "CF_ACCOUNT_ID를 찾을 수 없어요 — 환경변수 또는 wrangler.toml account_id 필요"
    exit 1
  fi

  log_info "Account ID: ${account_id:0:8}..."
  echo ""

  declare -A seen_db_ids

  for toml in "$PACKAGES_DIR"/*/wrangler.toml; do
    [ -f "$toml" ] || continue
    local pkg_name
    pkg_name=$(basename "$(dirname "$toml")")

    while IFS=: read -r binding db_name db_id; do
      [ -n "$db_id" ] || continue

      if [ -n "${seen_db_ids[$db_id]:-}" ]; then
        log_skip "[$db_name / $binding] (${db_id:0:8}...) — 이미 확인됨 (via ${seen_db_ids[$db_id]})"
        continue
      fi
      seen_db_ids[$db_id]="$pkg_name"

      check_db "$binding" "$db_name" "$db_id" "$account_id" "$token" "$pkg_name" || true

    done < <(parse_top_level_d1_blocks "$toml")
  done

  echo ""
  echo "════════════════════════════════════════════════════════════"
  printf "  결과: PASS=%s / FAIL=%s / SKIP=%s\n" "$PASS_COUNT" "$FAIL_COUNT" "$SKIP_COUNT"
  echo "════════════════════════════════════════════════════════════"

  if $AUTH_ERROR; then
    echo ""
    echo "❌ CF API 인증 오류 — CF_API_TOKEN 또는 CF_ACCOUNT_ID를 확인하세요"
    exit 2
  fi

  if [ "$FAIL_COUNT" -gt 0 ]; then
    echo ""
    echo "❌ D1 Binding Preflight FAIL — 누락 DB를 생성 후 재배포:"
    echo "   npx wrangler d1 create <database_name>"
    echo "   또는 Cloudflare Dashboard > Workers & Pages > D1"
    exit 1
  fi

  echo ""
  echo "✅ D1 Binding Preflight PASS — 모든 D1 binding 확인 완료"
  exit 0
}

main "$@"
