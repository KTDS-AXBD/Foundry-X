// F543: Phase 44 gating — fx-gateway → fx-discovery Items 엔드포인트 벤치마크
// 측정 경로: GET /api/discovery/items?limit=10 (Service Binding + D1 쿼리 전체 경로)
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://fx-gateway.ktds-axbd.workers.dev';

export const options = {
  stages: [
    { duration: '10s', target: 1 },   // warm-up
    { duration: '30s', target: 5 },   // baseline
    { duration: '30s', target: 20 },  // load
    { duration: '10s', target: 0 },   // cool-down
  ],
  thresholds: {
    // Go 판정 기준: p99 < 100ms
    'http_req_duration': ['p(99)<100'],
    'http_req_failed': ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/api/discovery/items?limit=10`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has items array': (r) => Array.isArray(r.json('items')),
  });
}
