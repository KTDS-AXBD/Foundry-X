---
id: FX-PLAN-f543-a2-k6-cloud
feature: F543 A2 후속 (F539 선행)
related_sprint: Sprint 294
date: 2026-04-14
author: Sinclair Seo
status: DRAFT
---

# F543 A2 / F539 선행 — k6 Cloud 인-리전 재측정 플랜

## TL;DR

F543 CONDITIONAL GO 판정의 조건 A2를 해소하기 위한 재측정 플랜. **F539(fx-gateway 프로덕션 배포 + URL 전환) 착수 전 1회 실행 필수**. WSL Korea 지리 한계를 제거한 인-리전 또는 k6 Cloud 환경에서 Service Binding p99를 재측정하여 Go/No-Go를 확정한다.

---

## §1 배경

F543 Sprint 291 측정(`docs/04-report/features/phase-44-latency-decision.md`)은 WSL Korea → Cloudflare 글로벌 PoP 간 지리 RTT가 절대값을 지배하여 p99 기준 800~1600ms로 나타났다. Service Binding 증분 p50 +10~14ms는 합리적이나, **서울 PoP 직접 연결 또는 CF 내부 기준 p99 < 100ms**는 미증명 상태로 CONDITIONAL GO 유지 중.

F539는 실제 프로덕션 트래픽을 fx-gateway → fx-discovery 경로로 전환하므로, 이 시점에 p99 SLO를 확정적으로 증빙해야 한다.

---

## §2 측정 환경 비교

| 옵션 | 위치 | 인프라 비용 | 데이터 신뢰도 | 준비 시간 |
|------|------|-----------|-------------|-----------|
| **k6 Cloud (Recommended)** | Grafana 관리 · 리전 선택 가능(Seoul/Tokyo/Virginia) | 무료 티어(50 VU/50 min/월) | 상 — 리전별 공개 노드 | 1h |
| k6 OSS + GCP Seoul VM | GCP `asia-northeast3` e2-micro | ~$0.01/h (1h이내 free) | 상 — 실 인-리전 | 2h (VM 프로비저닝) |
| Cloudflare Workers Trace | Workers 내부 체이닝 호출 시 Trace Events | 무료 | 중 — 사용자 체감과 무관 | 30min (코드 삽입) |
| fx-gateway 자체 계측 | `performance.now()` + D1 저장 | 무료 | 중 — Self-reported | 1h (코드 추가) |

**추천**: **k6 Cloud** — 기존 `benchmarks/phase-44-latency/k6-items.js` 재사용 가능, 1시간 내 완료.

---

## §3 측정 대상 + 기준

### 3.1 측정 엔드포인트

| # | 경로 | 비교 | 목적 |
|---|------|------|------|
| E1 | `GET /api/discovery/health` (직접 fx-discovery) | baseline | 지리 RTT 측정 |
| E2 | `GET /api/discovery/health` (via fx-gateway) | Service Binding 비교 | 오버헤드 측정 |
| E3 | `GET /api/discovery/items?limit=10` (via fx-gateway) | D1 포함 실 경로 | 프로덕션 유사 부하 |
| E4 | `POST /api/biz-items/:id/discovery-graph/run-all` (via fx-gateway) | 장기 실행 LLM 체이닝 | p99 최악 케이스 |

### 3.2 부하 프로파일 (k6 options)

```js
export const options = {
  stages: [
    { duration: '30s', target: 5 },    // ramp-up
    { duration: '2m',  target: 20 },   // steady
    { duration: '30s', target: 50 },   // spike
    { duration: '1m',  target: 20 },   // recover
    { duration: '30s', target: 0 },    // ramp-down
  ],
  thresholds: {
    'http_req_duration{endpoint:E1}': ['p(99)<300'],   // 직접 (지리 RTT 포함)
    'http_req_duration{endpoint:E2}': ['p(99)<320'],   // gateway (+20ms 이내)
    'http_req_duration{endpoint:E3}': ['p(99)<500'],   // D1 포함
    'http_req_duration{endpoint:E4}': ['p(99)<15000'], // LLM 30~60초도 허용
    'checks{check:status-200}':       ['rate>0.995'],
  },
};
```

### 3.3 Go/No-Go 기준

| 지표 | Go 임계값 | 해석 |
|------|---------|------|
| **Service Binding 증분 p99** (E2−E1) | **< 50ms** | Go |
| Service Binding 증분 p99 | 50~150ms | 조건부 Go — 캐싱 등 개선 검토 |
| Service Binding 증분 p99 | > 150ms | **No-Go** — fx-gateway 경로 재설계 |
| E3 (D1 포함) p99 절대값 | < 500ms (Seoul 리전 기준) | SLO 충족 |
| Error rate | < 0.5% | 안정성 |

---

## §4 실행 체크리스트

### 4.1 사전 준비 (30분)

- [ ] k6 Cloud 계정 생성(기존 없으면) — https://app.k6.io
- [ ] API token 발급 → `scripts/k6/.env.example`에 `K6_CLOUD_TOKEN=` 추가 (gitignore)
- [ ] `benchmarks/phase-44-latency/k6-items.js`에 **tag endpoint 분기** 추가 (E1~E4)
- [ ] `benchmarks/phase-44-latency/k6-cloud.js` 신규 — Seoul 리전 지정 + thresholds 위 프로필
- [ ] JWT 획득 + 환경 변수 설정 (E4 측정에 필요)

### 4.2 실행 (15분)

```bash
# k6 Cloud 실행 (Seoul 리전 고정)
K6_CLOUD_TOKEN=... k6 cloud --exec items --env JWT="$FX_JWT" \
  benchmarks/phase-44-latency/k6-cloud.js

# 또는 k6 OSS on GCP Seoul VM (대안)
gcloud compute instances create k6-seoul --zone=asia-northeast3-a \
  --machine-type=e2-micro --image-family=debian-12 --image-project=debian-cloud
gcloud compute ssh k6-seoul --zone=asia-northeast3-a -- \
  'curl -sSL https://dl.k6.io/.../install.sh | sh && k6 run -v ./k6-cloud.js'
```

### 4.3 사후 분석 (30분)

- [ ] k6 Cloud 웹 UI에서 각 endpoint별 p50/p95/p99/max 추출 → `docs/04-report/f539-k6-cloud-result.md`
- [ ] Service Binding 증분 p99(E2−E1) 계산 + Go/No-Go 판정 표 작성
- [ ] 판정이 **Go** → F539 SPEC에 "A2 해소 ✅ (PR #XXX)" 표시 + Sprint 294 착수 승인
- [ ] 판정이 **No-Go** → F539 보류 + 대안 설계 (예: service binding 대체 — direct fetch, WebSocket 채널 등)
- [ ] 판정이 **조건부 Go** → 완화 조치(캐싱/pooling) 후 재측정

---

## §5 산출물

| 파일 | 설명 |
|------|------|
| `benchmarks/phase-44-latency/k6-cloud.js` | k6 Cloud 실행 스크립트 (신규) |
| `scripts/k6/.env.example` | k6 Cloud 토큰 환경변수 예시 |
| `docs/04-report/f539-k6-cloud-result.md` | 측정 결과 + Go/No-Go 판정 리포트 |
| SPEC.md F539 비고 | A2 해소 결과 반영 |

---

## §6 타임박스 + 리스크

- **타임박스**: 2~3시간(준비 30min + 실행 15min + 분석 30min + 여유 1h)
- **리스크**:
  - k6 Cloud 무료 티어 월 50 VU·min 한도 → 스크립트 이전 시 로컬 dry-run 필수
  - `E4` LLM 실행은 비용 유발(ANTHROPIC API) → 1회 측정으로 제한
  - Seoul 리전 측정 node가 Cloudflare Seoul PoP와 일치하는 RTT 경로 아닐 수 있음 — 추가 노드(Tokyo)도 비교 권장

---

## §7 후속 작업

- 판정 결과에 따라 F539 Sprint 294 착수 여부 확정
- 결과 리포트를 `docs/specs/fx-msa-roadmap-v2/prd-final.md`에 링크 추가 (v2+1 개정 시)
- k6 CI 통합은 별도 C-track(C58 후속) — 현재 범위 외
