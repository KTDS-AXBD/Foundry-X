// F543: Phase 44 gating — fx-gateway → fx-discovery Health 엔드포인트 벤치마크
// 측정 경로: GET /api/discovery/health (Service Binding 오버헤드만, DB 없음)
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://fx-gateway.ktds-axbd.workers.dev';

export const options = {
  stages: [
    { duration: '10s', target: 1 },   // warm-up (콜드 스타트 제거)
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
  const res = http.get(`${BASE_URL}/api/discovery/health`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'domain is discovery': (r) => r.json('domain') === 'discovery',
    'status is ok': (r) => r.json('status') === 'ok',
  });
}
