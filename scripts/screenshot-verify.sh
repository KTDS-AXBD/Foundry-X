#!/usr/bin/env bash
# scripts/screenshot-verify.sh — web 변경 시 Playwright MCP로 스크린샷 검증
#
# Usage: bash scripts/screenshot-verify.sh [--force] [--url <base_url>]
#
# 기본 동작:
#   1. git diff master..HEAD에서 packages/web/ 변경 감지
#   2. 변경이 있으면 (또는 --force) Playwright로 주요 페이지 스크린샷 캡처
#   3. 결과를 .screenshots/ 디렉토리에 저장
#
# 환경변수:
#   WEB_URL       — 스크린샷 대상 URL (기본: http://localhost:5173)
#   SCREENSHOT_DIR — 저장 디렉토리 (기본: .screenshots)

set -eo pipefail

FORCE=false
WEB_URL="${WEB_URL:-http://localhost:5173}"
SCREENSHOT_DIR="${SCREENSHOT_DIR:-.screenshots}"

while [ $# -gt 0 ]; do
  case "$1" in
    --force) FORCE=true; shift ;;
    --url)   WEB_URL="$2"; shift 2 ;;
    *)       shift ;;
  esac
done

# ─── Step 1: web 변경 감지 ──────────────────────────────────────────────────
has_web_changes() {
  local base="${1:-master}"
  git diff --name-only "${base}..HEAD" 2>/dev/null | grep -q '^packages/web/' \
    || git diff --name-only --cached 2>/dev/null | grep -q '^packages/web/' \
    || git status --porcelain 2>/dev/null | awk '{print $2}' | grep -q '^packages/web/'
}

if [ "$FORCE" = false ]; then
  if ! has_web_changes; then
    echo "[screenshot-verify] packages/web/ 변경 없음 — 스크린샷 생략"
    exit 0
  fi
  echo "[screenshot-verify] packages/web/ 변경 감지 — 스크린샷 검증 시작"
fi

# ─── Step 2: 출력 디렉토리 준비 ──────────────────────────────────────────────
mkdir -p "$SCREENSHOT_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# ─── Step 3: dev 서버 가용성 확인 ─────────────────────────────────────────────
check_server() {
  local url="$1"
  local max_wait=5
  local i=0
  while [ $i -lt $max_wait ]; do
    if curl -sf -o /dev/null --max-time 2 "$url" 2>/dev/null; then
      return 0
    fi
    i=$((i + 1))
    sleep 1
  done
  return 1
}

if ! check_server "$WEB_URL"; then
  echo "[screenshot-verify] ⚠️  $WEB_URL 접속 불가 — 스크린샷 생략"
  echo "[screenshot-verify] dev 서버가 실행 중이어야 해요: cd packages/web && pnpm dev"
  exit 0
fi

# ─── Step 4: Playwright로 스크린샷 캡처 ──────────────────────────────────────
# packages/web에 @playwright/test가 설치되어 있으므로 해당 경로에서 resolve
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
COMMON_DIR=$(git rev-parse --git-common-dir 2>/dev/null)
MAIN_REPO="${COMMON_DIR%%/.git*}"

PAGES=(
  "/|home"
  "/login|login"
  "/dashboard|dashboard"
)

CAPTURED=0
FAILED=0

# @playwright/test 모듈 접근 확인 (pnpm workspace 환경)
# packages/web에서 resolve해야 pnpm hoisted 경로를 찾을 수 있음
WEB_PKG_DIR="${MAIN_REPO}/packages/web"
if ! (cd "$WEB_PKG_DIR" && node -e "require('@playwright/test')" 2>/dev/null); then
  echo "[screenshot-verify] ⚠️  @playwright/test 모듈 없음 — 스크린샷 생략"
  echo "[screenshot-verify] 설치: cd packages/web && pnpm install"
  exit 0
fi

for entry in "${PAGES[@]}"; do
  path="${entry%%|*}"
  name="${entry##*|}"
  url="${WEB_URL}${path}"
  outfile="$(pwd)/${SCREENSHOT_DIR}/${name}-${TIMESTAMP}.png"

  echo -n "[screenshot-verify] ${name} (${url})... "

  # pnpm workspace에서 모듈 resolve를 위해 packages/web에서 실행
  if (cd "$WEB_PKG_DIR" && node -e "
    const { chromium } = require('@playwright/test');
    (async () => {
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
      });
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
      try {
        await page.goto(process.argv[1], { waitUntil: 'networkidle', timeout: 15000 });
      } catch (e) {
        // networkidle timeout은 무시
      }
      await page.screenshot({ path: process.argv[2], fullPage: false });
      await browser.close();
    })();
  " "$url" "$outfile" 2>/dev/null); then
    echo "OK → ${outfile}"
    CAPTURED=$((CAPTURED + 1))
  else
    echo "FAIL"
    FAILED=$((FAILED + 1))
  fi
done

# ─── Step 5: 결과 요약 ──────────────────────────────────────────────────────
echo ""
echo "[screenshot-verify] 완료: ${CAPTURED} captured, ${FAILED} failed"
echo "[screenshot-verify] 저장 위치: ${SCREENSHOT_DIR}/"

if [ $CAPTURED -gt 0 ]; then
  ls -la "${SCREENSHOT_DIR}/"*-${TIMESTAMP}.png 2>/dev/null
fi

exit 0
