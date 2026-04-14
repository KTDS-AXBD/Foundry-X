#!/usr/bin/env bash
# F543: Phase 44 gating latency 벤치마크 실행 스크립트 (k6 사용)
# 사용법: ./run.sh [BASE_URL]
# 기본값: BASE_URL=https://fx-gateway.ktds-axbd.workers.dev

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="${1:-https://fx-gateway.ktds-axbd.workers.dev}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULTS_DIR="${SCRIPT_DIR}/results"
mkdir -p "$RESULTS_DIR"

echo "=== Phase 44 Latency Benchmark ==="
echo "Target: ${BASE_URL}"
echo "Timestamp: ${TIMESTAMP}"
echo ""

if ! command -v k6 &>/dev/null; then
  echo "❌ k6 not installed. Use curl-bench.sh instead:"
  echo "   ./curl-bench.sh"
  exit 1
fi

# Health endpoint benchmark
echo "--- Health Endpoint ---"
k6 run \
  --env BASE_URL="${BASE_URL}" \
  --out json="${RESULTS_DIR}/health-${TIMESTAMP}.json" \
  --summary-export "${RESULTS_DIR}/health-summary-${TIMESTAMP}.json" \
  "${SCRIPT_DIR}/k6-health.js"

echo ""
echo "--- Items Endpoint ---"
k6 run \
  --env BASE_URL="${BASE_URL}" \
  --out json="${RESULTS_DIR}/items-${TIMESTAMP}.json" \
  --summary-export "${RESULTS_DIR}/items-summary-${TIMESTAMP}.json" \
  "${SCRIPT_DIR}/k6-items.js"

# Extract p99 values
echo ""
echo "=== Results Summary ==="
HEALTH_P99=$(cat "${RESULTS_DIR}/health-summary-${TIMESTAMP}.json" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(round(d['metrics']['http_req_duration']['values']['p(99)'], 2))" 2>/dev/null || echo "N/A")
ITEMS_P99=$(cat "${RESULTS_DIR}/items-summary-${TIMESTAMP}.json" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(round(d['metrics']['http_req_duration']['values']['p(99)'], 2))" 2>/dev/null || echo "N/A")

echo "Health p99: ${HEALTH_P99}ms"
echo "Items  p99: ${ITEMS_P99}ms"

# Go/No-Go judgment
determine_verdict() {
  local p99="$1"
  local name="$2"
  if [ "$p99" = "N/A" ]; then
    echo "UNKNOWN"
    return
  fi
  local p99_int=$(echo "$p99" | cut -d. -f1)
  if [ "$p99_int" -lt 100 ]; then
    echo "GO (p99=${p99}ms < 100ms)"
  elif [ "$p99_int" -lt 200 ]; then
    echo "CONDITIONAL (p99=${p99}ms — 최적화 후 재측정 권장)"
  else
    echo "NO_GO (p99=${p99}ms > 200ms — PRD 재설계 필요)"
  fi
}

echo ""
echo "=== Go/No-Go Verdict ==="
echo "Health: $(determine_verdict "$HEALTH_P99" "health")"
echo "Items:  $(determine_verdict "$ITEMS_P99" "items")"
echo ""
echo "Results saved to: ${RESULTS_DIR}/"
