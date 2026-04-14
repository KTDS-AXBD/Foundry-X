#!/usr/bin/env bash
# F543: Phase 44 gating latency 벤치마크 — curl 기반 대안 (k6 미설치 환경)
# 사용법: ./curl-bench.sh [BASE_URL] [SAMPLES]
# 기본값: BASE_URL=https://fx-gateway.ktds-axbd.workers.dev, SAMPLES=100

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_URL="${1:-https://fx-gateway.ktds-axbd.workers.dev}"
SAMPLES="${2:-100}"
WARMUP_ROUNDS=5
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULTS_DIR="${SCRIPT_DIR}/results"
mkdir -p "$RESULTS_DIR"

echo "=== Phase 44 Latency Benchmark (curl) ==="
echo "Target: ${BASE_URL}"
echo "Samples: ${SAMPLES} (+ ${WARMUP_ROUNDS} warmup)"
echo ""

# Measure a single endpoint: returns array of times in ms
measure_endpoint() {
  local url="$1"
  local label="$2"
  local times=()

  echo "Measuring: ${label}"

  # Warm-up (discard)
  for i in $(seq 1 "$WARMUP_ROUNDS"); do
    curl -s -o /dev/null -w "%{time_total}" "$url" > /dev/null
  done

  # Measurement rounds
  for i in $(seq 1 "$SAMPLES"); do
    local t
    t=$(curl -s -o /dev/null -w "%{time_total}" "$url" 2>/dev/null)
    # Convert to milliseconds (integer)
    local ms
    ms=$(echo "$t" | awk '{printf "%d", $1 * 1000}')
    times+=("$ms")
    # Progress indicator every 10
    if (( i % 10 == 0 )); then printf "."; fi
  done
  echo " done"

  # Write raw times to temp file for awk processing
  local tmpfile
  tmpfile=$(mktemp)
  printf '%s\n' "${times[@]}" > "$tmpfile"

  # Sort and compute percentiles
  local sorted_file
  sorted_file=$(mktemp)
  sort -n "$tmpfile" > "$sorted_file"

  local count
  count=$(wc -l < "$sorted_file")

  # awk: compute p50, p95, p99, min, max, avg
  local stats
  stats=$(awk -v count="$count" '
    BEGIN { sum=0; }
    { arr[NR]=$1; sum+=$1; }
    END {
      avg = sum/NR;
      p50_idx = int(count * 0.50 + 0.5);
      p95_idx = int(count * 0.95 + 0.5);
      p99_idx = int(count * 0.99 + 0.5);
      if (p50_idx < 1) p50_idx = 1;
      if (p95_idx < 1) p95_idx = 1;
      if (p99_idx < 1) p99_idx = 1;
      printf "min=%d p50=%d p95=%d p99=%d max=%d avg=%.1f",
        arr[1], arr[p50_idx], arr[p95_idx], arr[p99_idx], arr[NR], avg;
    }
  ' "$sorted_file")

  rm -f "$tmpfile" "$sorted_file"

  echo "$stats"
}

# Determine verdict from p99
verdict() {
  local p99="$1"
  if [ "$p99" -lt 100 ]; then
    echo "GO"
  elif [ "$p99" -lt 200 ]; then
    echo "CONDITIONAL"
  else
    echo "NO_GO"
  fi
}

# --- Health endpoint ---
echo "--- Health: GET /api/discovery/health ---"
health_stats=$(measure_endpoint "${BASE_URL}/api/discovery/health" "health")
echo "  $health_stats"
health_p99=$(echo "$health_stats" | grep -oP 'p99=\K\d+')
health_verdict=$(verdict "$health_p99")

echo ""

# --- Items endpoint ---
echo "--- Items: GET /api/discovery/items?limit=10 ---"
items_stats=$(measure_endpoint "${BASE_URL}/api/discovery/items?limit=10" "items")
echo "  $items_stats"
items_p99=$(echo "$items_stats" | grep -oP 'p99=\K\d+')
items_verdict=$(verdict "$items_p99")

# --- Save JSON results ---
RESULT_FILE="${RESULTS_DIR}/curl-bench-${TIMESTAMP}.json"
cat > "$RESULT_FILE" <<JSON
{
  "timestamp": "${TIMESTAMP}",
  "base_url": "${BASE_URL}",
  "samples": ${SAMPLES},
  "tool": "curl",
  "endpoints": {
    "health": {
      "url": "${BASE_URL}/api/discovery/health",
      "stats": "${health_stats}",
      "p99_ms": ${health_p99},
      "verdict": "${health_verdict}"
    },
    "items": {
      "url": "${BASE_URL}/api/discovery/items?limit=10",
      "stats": "${items_stats}",
      "p99_ms": ${items_p99},
      "verdict": "${items_verdict}"
    }
  },
  "overall_verdict": "$([ "$health_verdict" = "GO" ] && [ "$items_verdict" = "GO" ] && echo "GO" || ([ "$health_verdict" = "NO_GO" ] || [ "$items_verdict" = "NO_GO" ] && echo "NO_GO" || echo "CONDITIONAL"))"
}
JSON

# --- Summary ---
echo ""
echo "=== Go/No-Go Verdict ==="
echo "Health  p99: ${health_p99}ms → ${health_verdict}"
echo "Items   p99: ${items_p99}ms  → ${items_verdict}"

OVERALL="GO"
if [ "$health_verdict" = "NO_GO" ] || [ "$items_verdict" = "NO_GO" ]; then
  OVERALL="NO_GO"
elif [ "$health_verdict" = "CONDITIONAL" ] || [ "$items_verdict" = "CONDITIONAL" ]; then
  OVERALL="CONDITIONAL"
fi

echo ""
echo "Overall: ${OVERALL}"
echo "Results: ${RESULT_FILE}"
