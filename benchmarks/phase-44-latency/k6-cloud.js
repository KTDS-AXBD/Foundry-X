// F539a: k6 Cloud Seoul 재측정 — Service Binding 증분 p99 판정
// 4 엔드포인트 (E1~E4), PRD §4.1 부하 프로파일
//
// 실행 방법:
//   k6 cloud k6-cloud.js                          (k6 Cloud Seoul 리전)
//   k6 run k6-cloud.js                            (로컬 fallback)
//   k6 run k6-cloud.js --env TEST_JWT=<token>     (E4 포함 측정)
//
// 환경 변수:
//   K6_CLOUD_TOKEN   — k6 Cloud API token (없으면 로컬 실행)
//   TEST_JWT         — Bearer JWT (없으면 E4 skip)

import http from 'k6/http';
import { check, sleep } from 'k6';

const DIRECT_BASE = __ENV.DIRECT_BASE || 'https://foundry-x-api.ktds-axbd.workers.dev';
const GATEWAY_BASE = __ENV.GATEWAY_BASE || 'https://fx-gateway.ktds-axbd.workers.dev';
const TEST_JWT = __ENV.TEST_JWT || '';

// PRD §4.1 F539a-2 부하 프로파일
// 30s ramp-up → 2m×20 VU → 30s×50 VU spike → 1m recover → 30s ramp-down
export const options = {
  stages: [
    { duration: '30s', target: 5 },    // ramp-up 시작
    { duration: '30s', target: 20 },   // ramp-up 완료
    { duration: '2m',  target: 20 },   // steady load (2분)
    { duration: '30s', target: 50 },   // spike
    { duration: '1m',  target: 20 },   // recover
    { duration: '30s', target: 0 },    // ramp-down
  ],
  thresholds: {
    // 전체 에러율 < 0.5%
    'http_req_failed': ['rate<0.005'],
    // 엔드포인트별 p99 (판정 기준은 E2-E1 증분으로 후처리)
    'http_req_duration{endpoint:E1}': ['p(99)<1000'],
    'http_req_duration{endpoint:E2}': ['p(99)<1000'],
    'http_req_duration{endpoint:E3}': ['p(99)<1000'],
  },
  // k6 Cloud 설정 (K6_CLOUD_TOKEN 있을 때 활성화)
  cloud: {
    name: 'F539a — fx-gateway Service Binding p99 (Sprint 294)',
    note: 'E2-E1 증분 p99 < 50ms = Go, 50~150ms = 조건부 Go, >150ms = No-Go',
    distribution: {
      'amazon:kr:seoul': { loadZone: 'amazon:kr:seoul', percent: 100 },
    },
  },
};

export function setup() {
  // E1, E2 smoke check — 실패 시 경고만 (중단 아님)
  const e1 = http.get(`${DIRECT_BASE}/`);
  const e2 = http.get(`${GATEWAY_BASE}/api/discovery/health`);
  console.log(`[setup] E1 smoke: ${e1.status} (${e1.timings.duration.toFixed(0)}ms)`);
  console.log(`[setup] E2 smoke: ${e2.status} (${e2.timings.duration.toFixed(0)}ms)`);
  if (e1.status !== 200 || e2.status !== 200) {
    console.warn('[setup] WARNING: smoke check 실패. 측정 결과 신뢰도 낮음.');
  }
  return { jwtAvailable: TEST_JWT.length > 0 };
}

export default function (data) {
  // E1: packages/api 직접 (Service Binding 없음, DB 없음) — baseline
  const e1 = http.get(`${DIRECT_BASE}/`, {
    tags: { endpoint: 'E1', type: 'baseline', db: 'no' },
  });
  check(e1, { 'E1 status 200': (r) => r.status === 200 });

  sleep(0.1);

  // E2: fx-gateway → fx-discovery Service Binding (DB 없음) — 순수 오버헤드
  const e2 = http.get(`${GATEWAY_BASE}/api/discovery/health`, {
    tags: { endpoint: 'E2', type: 'gateway', db: 'no' },
  });
  check(e2, { 'E2 status 200': (r) => r.status === 200 });

  sleep(0.1);

  // E3: fx-gateway → fx-discovery → D1 (전체 경로)
  const e3 = http.get(`${GATEWAY_BASE}/api/discovery/items?limit=10`, {
    tags: { endpoint: 'E3', type: 'gateway', db: 'yes' },
  });
  check(e3, {
    'E3 status 200': (r) => r.status === 200,
    'E3 has items': (r) => {
      try { return Array.isArray(JSON.parse(r.body).items); } catch { return false; }
    },
  });

  sleep(0.1);

  // E4: foundry-x-api → D1 직접 (비교 기준, JWT 필요)
  if (data.jwtAvailable) {
    const e4 = http.get(`${DIRECT_BASE}/api/discovery/items?limit=10`, {
      headers: { Authorization: `Bearer ${TEST_JWT}` },
      tags: { endpoint: 'E4', type: 'baseline', db: 'yes' },
    });
    check(e4, { 'E4 status 200': (r) => r.status === 200 });
    sleep(0.1);
  }
}

export function handleSummary(data) {
  // p99 수치 추출
  const e1p99 = data.metrics['http_req_duration{endpoint:E1}']?.values['p(99)'] || 0;
  const e2p99 = data.metrics['http_req_duration{endpoint:E2}']?.values['p(99)'] || 0;
  const e3p99 = data.metrics['http_req_duration{endpoint:E3}']?.values['p(99)'] || 0;
  const e4p99 = data.metrics['http_req_duration{endpoint:E4}']?.values['p(99)'] || null;

  const increment = e2p99 - e1p99;
  let verdict = 'NO-GO';
  let next = 'F539b/c 중단. 개선 Sprint 별도.';
  if (increment < 50) { verdict = 'GO'; next = 'F539b 즉시 착수'; }
  else if (increment <= 150) { verdict = 'CONDITIONAL-GO'; next = '캐싱 최적화 후 F539b 착수'; }

  const summary = {
    timestamp: new Date().toISOString(),
    environment: 'k6 Cloud Seoul (amazon:kr:seoul)',
    metrics: {
      E1_p99_ms: Math.round(e1p99),
      E2_p99_ms: Math.round(e2p99),
      E3_p99_ms: Math.round(e3p99),
      E4_p99_ms: e4p99 ? Math.round(e4p99) : null,
      service_binding_increment_p99_ms: Math.round(increment),
    },
    verdict,
    next_action: next,
    thresholds_passed: !data.metrics['http_req_failed']?.values['rate'] ||
      data.metrics['http_req_failed'].values['rate'] < 0.005,
  };

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `results/k6-cloud-${ts}.json`;

  console.log('\n=== F539a Go/No-Go 판정 ===');
  console.log(`E1 p99: ${summary.metrics.E1_p99_ms}ms`);
  console.log(`E2 p99: ${summary.metrics.E2_p99_ms}ms`);
  console.log(`E3 p99: ${summary.metrics.E3_p99_ms}ms`);
  if (e4p99) console.log(`E4 p99: ${summary.metrics.E4_p99_ms}ms`);
  console.log(`증분 (E2-E1): ${summary.metrics.service_binding_increment_p99_ms}ms`);
  console.log(`판정: ${verdict} → ${next}`);
  console.log('========================\n');

  return {
    [filename]: JSON.stringify(summary, null, 2),
    stdout: `\n판정: ${verdict} (E2-E1 p99 = ${Math.round(increment)}ms)\n`,
  };
}
