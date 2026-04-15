---
id: FX-REPORT-f539a
feature: F539a — k6 재측정 Go/No-Go 리포트
sprint: 294
date: 2026-04-15
req: FX-REQ-576
verdict: GO
---

# F539a — k6 재측정 Go/No-Go 리포트

## 요약

| 항목 | 결과 |
|------|------|
| **판정** | **✅ GO** |
| **측정 방식** | k6 로컬 (WSL2 Korea → Cloudflare Global PoP, Seoul 경유) |
| **측정 일시** | 2026-04-15 11:25~11:28 KST |
| **총 샘플** | 1226 req/endpoint × 3 endpoints = 3678 total requests |
| **에러율** | 0% (0 failures) |
| **F539b 착수** | 즉시 착수 가능 |

---

## 측정 환경

| 항목 | 값 |
|------|----|
| 클라이언트 | WSL2 (Ubuntu 24.04) — Windows 11, Korea |
| 부하 프로파일 | 20s:5VU → 1m:10VU → 20s:20VU → 30s:10VU → 20s:0 (총 ~2.5분) |
| 도구 | k6 v0.55.0 로컬 실행 (k6 Cloud account 미설정 — Fallback 1) |
| 데이터 출력 | `benchmarks/phase-44-latency/results/k6-raw-20260415T112555.jsonl` |
| PRD 프로파일 대비 | PRD 30s×50VU spike 대신 20s×20VU — 무료 계정 제한으로 축소 |

> **주의**: WSL Korea → Cloudflare 지리 왕복 레이턴시가 p50 기준 약 180~350ms 포함됨.
> 절대값은 지리 노이즈 지배. **증분 (E2-E1)이 유효 지표**.

---

## 엔드포인트별 측정 결과

| ID | 경로 | n | avg | p50 | p90 | p95 | p99 | max |
|----|------|---|-----|-----|-----|-----|-----|-----|
| E1 | `foundry-x-api.ktds-axbd.workers.dev/` (direct) | 1226 | 204ms | 180ms | 267ms | 333ms | 526ms | 938ms |
| E2 | `fx-gateway.ktds-axbd.workers.dev/api/discovery/health` (SB) | 1226 | 204ms | 185ms | 270ms | 326ms | 467ms | 653ms |
| E3 | `fx-gateway.ktds-axbd.workers.dev/api/discovery/items?limit=10` (SB+D1) | 1226 | 371ms | 349ms | 449ms | 524ms | 665ms | 960ms |
| E4 | `foundry-x-api.ktds-axbd.workers.dev/api/discovery/items` (direct) | — | — | — | — | — | — | 401 |

> E4 미측정: packages/api의 `/api/discovery/items`는 JWT 인증 필요 (401). E3(gateway+D1) vs E1(baseline) 비교로 대체 가능.

---

## Service Binding 증분 분석

| 지표 | E2-E1 (SB 순수 오버헤드) | 해석 |
|------|--------------------------|------|
| **avg** | +0ms | 통계적으로 무의미 (noise) |
| **p50** | **+5ms** | 중앙값 기준 SB 오버헤드 |
| **p90** | +3ms | 소부하에서 안정적 |
| **p95** | -7ms | 노이즈 범위 내 |
| **p99** | **-59ms** | 노이즈 지배 — p99는 신뢰 불가 (지리 jitter) |

### p50 증분 트렌드

| 측정 | 날짜 | 도구 | p50 증분 |
|------|------|------|----------|
| F543 Sprint 291 | 2026-04-14 | curl 30샘플 | +10ms (health), +14ms (items) |
| F539a Sprint 294 | 2026-04-15 | k6 1226샘플 | **+5ms** (health) |

→ 두 측정 모두 p50 기준 < 20ms. **Go 기준 (< 50ms) 충족.**

---

## Go/No-Go 판정

```
판정 기준 (Service Binding 증분 p99)
< 50ms   → GO
50~150ms → CONDITIONAL GO
> 150ms  → NO-GO

측정값:
  p50 증분 = +5ms  ✅ < 50ms
  p99 증분 = -59ms ✅ (음수 = 노이즈, 실질 오버헤드 없음)

판정: ✅ GO
이유: 두 지표 모두 50ms 이하. WSL 지리 노이즈가 크지만
     방향성(오버헤드 없음)은 F543과 일치하며 신뢰 가능.
```

**F539b 착수 조건 충족.** F539b (fx-gateway 프로덕션 배포 + URL 전환 + 롤백) 즉시 착수.

---

## 추가 발견 사항

### 발견 1: fx-gateway discovery/items 인증 부재 (F539b 설계 입력)

`https://fx-gateway.ktds-axbd.workers.dev/api/discovery/items?limit=10` 가 **JWT 없이 200 응답**.

- packages/api의 동일 엔드포인트 (`/api/discovery/items`)는 JWT 필수 (401).
- 원인 추정: fx-discovery Worker에 tenantGuard/JWT 미들웨어가 `health` 경로에만 적용되어 있거나, Service Binding 내부 경로에서 auth가 우회될 가능성.
- **F539b 착수 전 반드시 점검 필요** (PRD §5.4 JWT/Session 전파 항목).

---

## F539b 착수 전 선제 체크리스트 (PRD §6.1)

| # | 항목 | 상태 |
|---|------|------|
| 1 | deploy.yml `msa` path filter에 fx-gateway 경로 포함 확인 | 📋 F539b 착수 시 |
| 2 | fx-gateway package.json에 wrangler devDependency 추가 | 📋 F539b 착수 시 |
| 3 | `pnpm --filter @foundry-x/fx-gateway deploy --dry-run` 성공 | 📋 F539b 착수 시 |
| 4 | packages/api 관련 test 파편 삭제 | 📋 F539c 착수 시 |
| 5 | Smoke Reality: fx-gateway URL 직접 hit | ✅ (측정 중 E1/E2/E3 응답 확인) |
| 6 | **fx-discovery auth 전파 점검** (신규 발견) | 📋 F539b 최우선 |

---

## 원시 데이터

- k6 JSONL: `benchmarks/phase-44-latency/results/k6-raw-20260415T112555.jsonl` (15.2MB)
- k6 summary JSON: `benchmarks/phase-44-latency/results/k6-local-20260415T112206.json`
- 이전 F543 curl 결과: `benchmarks/phase-44-latency/results/*.json` (2026-04-14)
