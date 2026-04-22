/**
 * F567: 1-hop baseline benchmark — fx-discovery 직접 호출 (FX-REQ-610)
 *
 * F543 기준: Service Binding p50 +10~14ms
 * 이 스크립트는 "gateway 없이 직접 호출" 기준선을 측정함
 *
 * 실행:
 *   k6 run scripts/benchmarks/k6/single-hop-baseline.js \
 *     -e DISCOVERY_URL=https://fx-discovery.ktds-axbd.workers.dev \
 *     -e AUTH_TOKEN=<bearer_token>
 */
import http from "k6/http";
import { sleep, check } from "k6";

export const options = {
  scenarios: {
    baseline: {
      executor: "constant-vus",
      vus: 10,
      duration: "30s",
    },
  },
  thresholds: {
    "http_req_duration": ["p(95)<200", "p(50)<80"],
  },
};

const DISCOVERY_URL = __ENV.DISCOVERY_URL || "https://fx-discovery.ktds-axbd.workers.dev";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";

export default function () {
  const res = http.get(`${DISCOVERY_URL}/api/biz-items`, {
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
  });

  check(res, {
    "status 200 or 401": (r) => r.status === 200 || r.status === 401,
  });

  sleep(0.1);
}
