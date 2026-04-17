---
id: FX-DESIGN-291
feature: F543
sprint: 291
date: 2026-04-14
author: Sinclair Seo
---

# Sprint 291 Design — F543: Phase 44 gating latency 벤치마크

## §1 아키텍처 컨텍스트

```
[k6 / curl-bench] ──HTTP──▶ [fx-gateway Worker]
                                 │ Service Binding (internal)
                                 ▼
                          [fx-discovery Worker]
                                 │ D1 binding
                                 ▼
                          [foundry-x-db (D1)]
```

측정 경계:
- **전체 RTT**: k6가 측정하는 값 = 네트워크 + Cloudflare 엣지 + Gateway + Binding + Discovery + DB
- **Service Binding 오버헤드**: Health(DB 없음) vs Items(DB 포함) 차이로 추정 가능

## §2 파일 매핑 (신규 생성)

| 파일 | 종류 | 역할 |
|------|------|------|
| `benchmarks/phase-44-latency/k6-health.js` | k6 script | Health 엔드포인트 부하 시나리오 |
| `benchmarks/phase-44-latency/k6-items.js` | k6 script | Items 엔드포인트 부하 시나리오 |
| `benchmarks/phase-44-latency/run.sh` | bash | k6 실행 → JSON 결과 저장 → p99 추출 |
| `benchmarks/phase-44-latency/curl-bench.sh` | bash | curl 기반 대안 벤치마크 (100회 반복, p99 계산) |
| `benchmarks/phase-44-latency/README.md` | docs | 실행 방법 + 임계값 설명 |
| `docs/04-report/features/phase-44-latency-decision.md` | report | Go/No-Go 판정 리포트 (실측값 채움) |

## §3 k6 스크립트 설계

### k6-health.js 구조

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

export const options = {
  stages: [
    { duration: '10s', target: 1 },  // warm-up
    { duration: '30s', target: 5 },  // baseline
    { duration: '30s', target: 20 }, // load
    { duration: '10s', target: 0 },  // cool-down
  ],
  thresholds: {
    http_req_duration: ['p(99)<100'],  // Go 기준
  },
};
```

### k6-items.js 구조

동일 부하 시나리오, `GET /api/discovery/items?limit=10` 타겟.

## §4 curl-bench.sh 설계 (k6 대안)

```
알고리즘:
1. WARMUP_ROUNDS=5: 첫 콜드 스타트 제거
2. SAMPLE_COUNT=100: 측정 횟수
3. 각 요청: curl -s -o /dev/null -w "%{time_total}" → 밀리초 변환
4. 배열 정렬 → p50, p95, p99 계산 (awk)
5. JSON 결과 파일 저장: results/curl-{endpoint}-{timestamp}.json
6. p99 임계값 판정: < 100ms → GO / 100~200ms → CONDITIONAL / > 200ms → NO_GO
```

## §5 판정 리포트 구조

```markdown
# Phase 44 Latency Decision Report

## 측정 결과
| 엔드포인트 | p50 | p95 | p99 | 판정 |
...

## Go/No-Go 결정
결정: GO / CONDITIONAL / NO_GO

## 근거
...

## 후속 조치
- Go → F538 착수 승인
- No-Go → PRD 재설계 필요
```

## §6 TDD

- 벤치마크 스크립트는 TDD 면제 (측정 도구)
- curl-bench.sh의 p99 계산 로직: awk one-liner, 인라인 검증으로 충분

## §7 Design 체크리스트 (Stage 3 Exit)

| # | 항목 | 상태 |
|---|------|------|
| D1 | 주입 사이트 전수 검증 — 신규 파일만, 기존 코드 무변경 | ✅ 신규 파일만 추가, 기존 코드 미수정 |
| D2 | 식별자 계약 — URL 상수는 `BASE_URL` 환경변수로 관리 | ✅ scripts에 `BASE_URL` 파라미터 |
| D3 | Breaking change 없음 — 기존 Workers 미수정 | ✅ 해당 없음 |
| D4 | TDD Red — 면제 대상 (측정 스크립트) | ✅ 면제 명시 |
