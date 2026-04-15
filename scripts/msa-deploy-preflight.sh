#!/usr/bin/env bash
#
# MSA Deploy Preflight (C69)
#
# F540/F541 (or any new fx-* domain) 착수 전 배포 파이프라인 정합성 검증.
# feedback_msa_deploy_pipeline_gaps.md 5항목 자동 점검.
#
# Usage:
#   bash scripts/msa-deploy-preflight.sh [fx-package-name]
#
#   - fx-package-name 생략 시: 모든 packages/fx-* 검사
#   - fx-package-name 지정 시: 해당 패키지만 검사 (예: fx-gateway, fx-discovery)
#
# Exit code:
#   0 — 모든 체크 PASS
#   1 — 하나 이상 FAIL
#
# Reference: docs/04-report/phase-44-f539-retrospective.md §L2, Sprint 293 F538 교훈

set -u
set -o pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

TARGET_PKG="${1:-}"
FAIL_COUNT=0
PASS_COUNT=0

log_info()  { printf '\033[36m[INFO]\033[0m  %s\n' "$*"; }
log_pass()  { printf '\033[32m[PASS]\033[0m  %s\n' "$*"; ((PASS_COUNT++)); }
log_fail()  { printf '\033[31m[FAIL]\033[0m  %s\n' "$*"; ((FAIL_COUNT++)); }
log_warn()  { printf '\033[33m[WARN]\033[0m  %s\n' "$*"; }

# ────────────────────────────────────────────────────────────────────
# Discover fx-* packages
# ────────────────────────────────────────────────────────────────────
discover_fx_packages() {
  if [ -n "$TARGET_PKG" ]; then
    if [ ! -d "packages/$TARGET_PKG" ]; then
      log_fail "packages/$TARGET_PKG not found"
      return 1
    fi
    echo "$TARGET_PKG"
  else
    find packages -maxdepth 1 -name "fx-*" -type d 2>/dev/null | sed 's|packages/||' | sort
  fi
}

# ────────────────────────────────────────────────────────────────────
# Check 1: deploy.yml msa path filter 포함
# ────────────────────────────────────────────────────────────────────
check_path_filter() {
  local pkg="$1"
  local deploy_yml=".github/workflows/deploy.yml"

  if [ ! -f "$deploy_yml" ]; then
    log_fail "[$pkg] $deploy_yml 없음"
    return 1
  fi

  # "packages/fx-*/**" 또는 "packages/$pkg/**" 매칭 확인
  if grep -qE "packages/(fx-\*\*|$pkg)" "$deploy_yml"; then
    log_pass "[$pkg] deploy.yml path filter 포함"
  else
    log_fail "[$pkg] deploy.yml msa path filter 누락 — 'packages/$pkg/**' 또는 'packages/fx-*/**' 추가 필요"
    return 1
  fi
}

# ────────────────────────────────────────────────────────────────────
# Check 2: wrangler 접근 경로 확보 (devDependency or 상대경로)
# ────────────────────────────────────────────────────────────────────
check_wrangler_access() {
  local pkg="$1"
  local pkg_json="packages/$pkg/package.json"

  if [ ! -f "$pkg_json" ]; then
    log_fail "[$pkg] $pkg_json 없음"
    return 1
  fi

  # devDependency에 wrangler 포함 or deploy.yml에 ../api/node_modules/.bin/wrangler 사용
  if grep -qE '"wrangler"' "$pkg_json"; then
    log_pass "[$pkg] wrangler devDependency 포함"
  elif grep -qE "packages/$pkg.*wrangler" .github/workflows/deploy.yml 2>/dev/null \
       && grep -qE "\.\./api/node_modules/\.bin/wrangler" .github/workflows/deploy.yml 2>/dev/null; then
    log_pass "[$pkg] deploy.yml 상대경로 wrangler 사용"
  else
    log_fail "[$pkg] wrangler 접근 경로 미확보 — devDependency 추가 또는 deploy.yml에서 상대경로 명시"
    return 1
  fi
}

# ────────────────────────────────────────────────────────────────────
# Check 3: pnpm deploy --dry-run
# ────────────────────────────────────────────────────────────────────
check_deploy_dry_run() {
  local pkg="$1"
  local wrangler_toml="packages/$pkg/wrangler.toml"

  if [ ! -f "$wrangler_toml" ]; then
    log_warn "[$pkg] wrangler.toml 없음 — Worker 패키지가 아닐 수 있음, skip"
    return 0
  fi

  log_info "[$pkg] pnpm deploy --dry-run 실행 중..."

  # wrangler deploy --dry-run: 실제 배포 없이 번들 생성만 확인
  local output
  output=$(cd "packages/$pkg" && \
    if [ -x "../api/node_modules/.bin/wrangler" ]; then \
      ../api/node_modules/.bin/wrangler deploy --dry-run --outdir=/tmp/preflight-$pkg 2>&1; \
    elif [ -x "./node_modules/.bin/wrangler" ]; then \
      ./node_modules/.bin/wrangler deploy --dry-run --outdir=/tmp/preflight-$pkg 2>&1; \
    else \
      echo "NO_WRANGLER_AVAILABLE"; \
    fi)

  if echo "$output" | grep -q "NO_WRANGLER_AVAILABLE"; then
    log_warn "[$pkg] wrangler 실행 불가 — Check 2 먼저 해소 후 재시도"
    return 0
  fi

  if echo "$output" | grep -qE "Success|Total Upload|bundled|Uploaded"; then
    log_pass "[$pkg] deploy --dry-run 성공"
    return 0
  elif echo "$output" | grep -qE "error|Error|failed|Failed|EUNSUPPORTEDPROTOCOL"; then
    log_fail "[$pkg] deploy --dry-run 실패 — 다음 에러:"
    echo "$output" | grep -E "error|Error|failed|Failed" | head -5 | sed 's/^/        /'
    return 1
  else
    log_warn "[$pkg] deploy --dry-run 결과 애매 — 수동 확인 권장"
    return 0
  fi
}

# ────────────────────────────────────────────────────────────────────
# Check 4: obsolete test 파편 (packages/api 내 이전된 routes의 잔여 테스트)
# ────────────────────────────────────────────────────────────────────
check_obsolete_test_debris() {
  local pkg="$1"

  # packages/$pkg/src/routes/*.ts의 파일명을 packages/api/src/__tests__/*.test.ts와 매칭
  local debris_count=0
  local routes_dir="packages/$pkg/src/routes"

  [ ! -d "$routes_dir" ] && {
    log_info "[$pkg] routes 디렉토리 없음, skip"
    return 0
  }

  while IFS= read -r route_file; do
    local route_base
    route_base=$(basename "$route_file" .ts)
    # packages/api에서 같은 이름의 test 파일 검색 (해당 routes이 이전되었는데 test가 남아있는지)
    if find packages/api/src -name "${route_base}*.test.ts" -type f 2>/dev/null | grep -q .; then
      log_warn "[$pkg] obsolete test 파편 의심: packages/api에 ${route_base}*.test.ts 존재 (이전 여부 확인 필요)"
      ((debris_count++))
    fi
  done < <(find "$routes_dir" -name "*.ts" ! -name "*.test.ts" 2>/dev/null)

  if [ $debris_count -eq 0 ]; then
    log_pass "[$pkg] packages/api test 파편 없음"
  else
    log_warn "[$pkg] test 파편 의심 $debris_count건 — 이전된 routes인지 수동 확인"
    # FAIL로 처리하지 않음 — 실제 이전 여부 판단 어려움
  fi
}

# ────────────────────────────────────────────────────────────────────
# Check 5: smoke — fx-gateway 프로덕션 URL (해당 시)
# ────────────────────────────────────────────────────────────────────
check_fx_gateway_smoke() {
  # fx-gateway에만 적용 (프로덕션 URL 접근성 확인)
  local gateway_url="https://fx-gateway.ktds-axbd.workers.dev/api/discovery/health"

  log_info "smoke curl: $gateway_url"

  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$gateway_url" 2>/dev/null || echo "ERR")

  case "$http_code" in
    200)
      log_pass "fx-gateway 프로덕션 smoke 200 OK"
      ;;
    401|403)
      log_pass "fx-gateway 프로덕션 smoke $http_code (auth protected — gateway live)"
      ;;
    ERR|000)
      log_fail "fx-gateway 프로덕션 응답 없음 — 배포 상태 확인 필요"
      return 1
      ;;
    *)
      log_warn "fx-gateway 응답 $http_code — 예상치 못한 코드, 수동 확인 권장"
      ;;
  esac
}

# ────────────────────────────────────────────────────────────────────
# Main
# ────────────────────────────────────────────────────────────────────
main() {
  echo "════════════════════════════════════════════════════════════"
  echo "  MSA Deploy Preflight (C69)"
  echo "  Ref: docs/04-report/phase-44-f539-retrospective.md §L2"
  echo "════════════════════════════════════════════════════════════"

  local packages
  packages=$(discover_fx_packages)

  if [ -z "$packages" ]; then
    log_fail "packages/fx-* 패키지 없음"
    exit 1
  fi

  log_info "대상 fx-* 패키지: $(echo $packages | tr '\n' ' ')"
  echo ""

  for pkg in $packages; do
    echo "─── $pkg ───"
    check_path_filter "$pkg" || true
    check_wrangler_access "$pkg" || true
    check_deploy_dry_run "$pkg" || true
    check_obsolete_test_debris "$pkg" || true
    echo ""
  done

  echo "─── fx-gateway 프로덕션 smoke ───"
  check_fx_gateway_smoke || true
  echo ""

  echo "════════════════════════════════════════════════════════════"
  echo "  결과: PASS=$PASS_COUNT / FAIL=$FAIL_COUNT"
  echo "════════════════════════════════════════════════════════════"

  if [ $FAIL_COUNT -gt 0 ]; then
    echo ""
    echo "❌ Preflight FAIL — 위 항목 해소 후 F540/F541 착수 권장"
    exit 1
  else
    echo ""
    echo "✅ Preflight PASS — 다음 MSA 도메인 분리 안전하게 진행 가능"
    exit 0
  fi
}

main "$@"
