# Phase 44 Latency Benchmark

F543: fx-gateway → fx-discovery Service Binding 레이턴시 벤치마크.

## 판정 기준

| p99 | 판정 | 후속 조치 |
|-----|------|----------|
| < 100ms | **GO** | F538 착수 승인 |
| 100~200ms | **CONDITIONAL** | 최적화 후 재측정 권장 |
| > 200ms | **NO_GO** | PRD 재설계 필요 |

## 실행 방법

### k6 사용 (권장)

```bash
# k6 설치: https://grafana.com/docs/k6/latest/get-started/installation/
k6 version

# 벤치마크 실행
./run.sh

# 다른 URL로 실행
./run.sh https://fx-gateway-staging.ktds-axbd.workers.dev
```

### curl 사용 (k6 미설치 시)

```bash
chmod +x curl-bench.sh
./curl-bench.sh

# 샘플 수 지정
./curl-bench.sh https://fx-gateway.ktds-axbd.workers.dev 200
```

## 측정 엔드포인트

| 엔드포인트 | 설명 |
|-----------|------|
| `GET /api/discovery/health` | Service Binding 오버헤드만 (DB 없음) |
| `GET /api/discovery/items?limit=10` | 전체 경로 (Service Binding + D1 쿼리) |

## 결과 파일

`results/` 디렉토리에 저장:
- `curl-bench-{timestamp}.json` — curl 기반 결과
- `health-summary-{timestamp}.json` — k6 health 요약
- `items-summary-{timestamp}.json` — k6 items 요약
