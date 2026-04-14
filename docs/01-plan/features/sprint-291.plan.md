---
id: FX-PLAN-291
feature: F543
sprint: 291
date: 2026-04-14
author: Sinclair Seo
---

# Sprint 291 Plan — F543: Phase 44 gating latency 벤치마크

## §1 목표

fx-gateway → fx-discovery Service Binding 호출 경로의 p99 레이턴시를 k6(또는 curl 기반)으로 측정하고, Go/No-Go 판정 리포트를 작성한다. 판정 기준: **p99 < 100ms** (가칭, 실측 결과로 확정). Go 판정 시 F538(Discovery 완전 분리) 착수, No-Go 시 PRD 재설계.

## §2 전제 조건

- Phase 39 Walking Skeleton 완료 (F520/F521/F522/F523 ✅)
- fx-gateway 배포 URL: `https://fx-gateway.ktds-axbd.workers.dev`
- fx-discovery Service Binding 경로: `/api/discovery/*`
- Service Binding 연결: `c.env.DISCOVERY.fetch(c.req.raw)` (workers 내부 직접 호출)

## §3 측정 대상 엔드포인트

| 엔드포인트 | 경로 | 설명 |
|-----------|------|------|
| Health (via gateway) | `GET /api/discovery/health` | 가장 가벼운 경로, Service Binding 오버헤드 측정 |
| Items list (via gateway) | `GET /api/discovery/items?limit=10` | 실제 D1 쿼리 포함 전체 경로 |

## §4 벤치마크 설계

### 도구 선택
- **1순위**: k6 (SPEC 명시)
- **대안**: curl 기반 통계 스크립트 (k6 미설치 환경용)

### 부하 시나리오

| 단계 | VU | Duration | 목적 |
|------|----|----------|------|
| Warm-up | 1 | 10s | 첫 요청 outlier 제거 |
| Baseline | 5 | 30s | 표준 부하 p99 |
| Load | 20 | 30s | 실제 사용 부하 p99 |

### 임계값
- p99 < 100ms → **Go** (F538 착수)
- p99 100~200ms → **조건부 Go** (최적화 후 재측정 권장)
- p99 > 200ms → **No-Go** (PRD 재설계 필요)

## §5 산출물

| 파일 | 설명 |
|------|------|
| `benchmarks/phase-44-latency/k6-health.js` | k6 스크립트 — health 엔드포인트 |
| `benchmarks/phase-44-latency/k6-items.js` | k6 스크립트 — items 엔드포인트 |
| `benchmarks/phase-44-latency/run.sh` | 벤치마크 실행 + JSON 결과 저장 |
| `benchmarks/phase-44-latency/curl-bench.sh` | curl 대안 스크립트 (k6 미설치 시) |
| `docs/04-report/phase-44-latency-decision.md` | Go/No-Go 판정 리포트 (실측값 포함) |

## §6 TDD 적용 여부

벤치마크 스크립트는 TDD 면제 대상 (실행 결과가 산출물, 로직 테스트 불필요).
단, curl-bench.sh는 통계 계산 로직 포함 → 간단한 단위 검증 포함.

## §7 완료 기준 (Exit Criteria)

- [ ] k6 또는 curl 기반 벤치마크 스크립트 실행 가능
- [ ] 실측 p99 값 도출 (최소 100 sample 이상)
- [ ] Go/No-Go 판정 리포트 작성 (`docs/04-report/phase-44-latency-decision.md`)
- [ ] SPEC.md F543 상태 → `✅`
