/**
 * F567: Multi-hop latency benchmark — fx-gateway → fx-discovery 3-hop 경로 (FX-REQ-610)
 *
 * 측정 경로:
 *   browser (k6 client) → fx-gateway (HTTP) → fx-discovery (Service Binding)
 *
 * SLO: p95 < 300ms (gateway_3hop 시나리오)
 *
 * 실행 방법:
 *   k6 run scripts/benchmarks/k6/multi-hop-latency.js \
 *     -e GATEWAY_URL=https://fx-gateway.ktds-axbd.workers.dev \
 *     -e DISCOVERY_URL=https://fx-discovery.ktds-axbd.workers.dev \
 *     -e AUTH_TOKEN=<bearer_token>
 */
import http from "k6/http";
import { sleep, check } from "k6";
import { Counter, Trend, Rate } from "k6/metrics";

// Custom metrics
const hopOverhead = new Trend("hop_overhead_ms");
const sloViolations = new Counter("slo_violations");
const successRate = new Rate("success_rate");

export const options = {
  scenarios: {
    gateway_3hop: {
      executor: "constant-vus",
      vus: 10,
      duration: "30s",
      env: { SCENARIO: "gateway" },
      tags: { scenario: "gateway_3hop" },
    },
    direct_baseline: {
      executor: "constant-vus",
      vus: 10,
      duration: "30s",
      startTime: "35s",
      env: { SCENARIO: "direct" },
      tags: { scenario: "direct_baseline" },
    },
  },
  thresholds: {
    // SLO: gateway 경유 p95 < 300ms
    "http_req_duration{scenario:gateway_3hop}": ["p(95)<300"],
    // baseline: 직접 호출 p95 < 200ms
    "http_req_duration{scenario:direct_baseline}": ["p(95)<200"],
    // 성공률 99% 이상
    "success_rate": ["rate>0.99"],
  },
};

const GATEWAY_URL = __ENV.GATEWAY_URL || "https://fx-gateway.ktds-axbd.workers.dev";
const DISCOVERY_URL = __ENV.DISCOVERY_URL || "https://fx-discovery.ktds-axbd.workers.dev";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";

const HEADERS = {
  Authorization: `Bearer ${AUTH_TOKEN}`,
  "Content-Type": "application/json",
};

export default function () {
  const isGateway = __ENV.SCENARIO === "gateway";
  const baseUrl = isGateway ? GATEWAY_URL : DISCOVERY_URL;

  const res = http.get(`${baseUrl}/api/biz-items`, { headers: HEADERS });

  const ok = check(res, {
    "status 200 or 401": (r) => r.status === 200 || r.status === 401,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });

  successRate.add(ok ? 1 : 0);

  if (res.timings.duration > 300 && isGateway) {
    sloViolations.add(1);
  }

  sleep(0.1);
}

export function handleSummary(data) {
  const gw = data.metrics?.["http_req_duration"]?.values;
  const summary = {
    scenario: "sprint-316-F567",
    timestamp: new Date().toISOString(),
    gateway_3hop: {
      p50: gw ? data.metrics["http_req_duration{scenario:gateway_3hop}"]?.values?.["p(50)"] : null,
      p95: gw ? data.metrics["http_req_duration{scenario:gateway_3hop}"]?.values?.["p(95)"] : null,
      p99: gw ? data.metrics["http_req_duration{scenario:gateway_3hop}"]?.values?.["p(99)"] : null,
    },
    direct_baseline: {
      p50: data.metrics["http_req_duration{scenario:direct_baseline}"]?.values?.["p(50)"] ?? null,
      p95: data.metrics["http_req_duration{scenario:direct_baseline}"]?.values?.["p(95)"] ?? null,
      p99: data.metrics["http_req_duration{scenario:direct_baseline}"]?.values?.["p(99)"] ?? null,
    },
    slo_violations: data.metrics["slo_violations"]?.values?.count ?? 0,
  };

  return {
    "docs/dogfood/sprint-316-latency-raw.json": JSON.stringify(summary, null, 2),
    stdout: JSON.stringify(summary, null, 2),
  };
}
