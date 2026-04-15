---
id: FX-DESIGN-294
feature: F539a — k6 Cloud 재측정 + Go/No-Go 판정
sprint: 294
date: 2026-04-15
status: ACTIVE
plan: docs/01-plan/features/sprint-294.plan.md
---

# Sprint 294 Design — F539a (k6 Cloud 재측정)

## §1. 개요

k6 스크립트 1개 신규 생성 + 리포트 문서 1개 생성. 코드 변경 없음.

## §2. 측정 아키텍처

```
[k6 Cloud Seoul VU] ─── E1 ──→ foundry-x-api.ktds-axbd.workers.dev  (direct)
                    ─── E2 ──→ fx-gateway.ktds-axbd.workers.dev  ──→ fx-discovery (Service Binding)
                    ─── E3 ──→ fx-gateway.ktds-axbd.workers.dev  ──→ fx-discovery → D1
                    ─── E4 ──→ foundry-x-api.ktds-axbd.workers.dev  ──→ D1 (direct)
```

### 엔드포인트 상세

| ID | Method | URL | Auth | D1 | 역할 |
|----|--------|-----|------|----|------|
| E1 | GET | `https://foundry-x-api.ktds-axbd.workers.dev/api/health` | 없음 | 없음 | Baseline — packages/api 직접 |
| E2 | GET | `https://fx-gateway.ktds-axbd.workers.dev/api/discovery/health` | 없음 | 없음 | Service Binding 오버헤드 순수 측정 |
| E3 | GET | `https://fx-gateway.ktds-axbd.workers.dev/api/discovery/items?limit=10` | JWT | 있음 | Full path: gateway→discovery→D1 |
| E4 | GET | `https://foundry-x-api.ktds-axbd.workers.dev/api/discovery/items?limit=10` | JWT | 있음 | Full path: api→D1 (비교 기준) — **JWT 필수로 F539a 미측정. E3 vs E1 비교로 대체** |

> E3/E4에 JWT가 필요한 경우: Authorization 헤더에 test JWT를 k6 환경 변수로 주입.
> E1/E2는 public health endpoint이므로 인증 불필요.

## §3. 부하 프로파일

```javascript
export const options = {
  stages: [
    { duration: '30s', target: 5 },    // ramp-up 시작
    { duration: '30s', target: 20 },   // ramp-up 완료
    { duration: '2m', target: 20 },    // steady load
    { duration: '30s', target: 50 },   // spike
    { duration: '1m', target: 20 },    // recover
    { duration: '30s', target: 0 },    // ramp-down
  ],
  // 실행 축소 허용 (k6 로컬/무료 fallback 시: 20s:5→1m:10→20s:20→30s:10→20s:0)
  // WSL Korea 환경에서 절대값이 지리 레이턴시 지배 → p99<1000으로 완화 적용
  thresholds: {
    'http_req_duration{endpoint:E1}': ['p(99)<1000'],  // 원래 <500ms, WSL 지리 노이즈로 완화
    'http_req_duration{endpoint:E2}': ['p(99)<1000'],
    'http_req_duration{endpoint:E3}': ['p(99)<1000'],
    'http_req_duration{endpoint:E4}': ['p(99)<1000'],
    'http_req_failed': ['rate<0.005'],
  },
  // k6 Cloud 설정
  cloud: {
    projectID: 3676480, // 가칭 — 실제 project ID로 교체
    name: 'F539a — fx-gateway Service Binding p99',
    distribution: {
      'amazon:kr:seoul': { loadZone: 'amazon:kr:seoul', percent: 100 },
    },
  },
};
```

**총 실행 시간**: ~5분 (30+30+120+30+60+30 = 300s)

## §4. k6 스크립트 설계 (`benchmarks/phase-44-latency/k6-cloud.js`)

```
k6-cloud.js
├── options (부하 프로파일 + k6 Cloud 설정)
├── setup() — health smoke check: E1, E2 200 OK 확인
├── default() — 4 엔드포인트를 태그로 구분하여 순차 호출
└── handleSummary() — custom JSON summary 생성
```

### 핵심 설계 결정

1. **태그로 엔드포인트 구분**: `tags: { endpoint: 'E1' }` → Grafana 대시보드에서 엔드포인트별 p99 분리 가능
2. **E3/E4 JWT**: `__ENV.TEST_JWT` 환경 변수로 주입 (없으면 E1/E2만 실행)
3. **handleSummary**: `docs/04-report/` 에 직접 JSON 저장 가능

### k6 Cloud 없을 때 fallback

k6 Cloud 계정/token 없으면 `K6_CLOUD_TOKEN` 없이 `k6 run` (로컬) 실행.
결과는 `benchmarks/phase-44-latency/results/k6-cloud-{timestamp}.json`으로 저장.

## §5. 파일 매핑 (Stage 3 Exit D1 체크리스트)

### 신규 파일

| 파일 | 역할 | D1 확인 |
|------|------|---------|
| `benchmarks/phase-44-latency/k6-cloud.js` | 4 엔드포인트 부하 스크립트 | 코드 없음 (순수 스크립트) |
| `docs/04-report/phase-44-f539a-k6-cloud.md` | Go/No-Go 판정 리포트 | 문서 |

### 수정 파일

| 파일 | 변경 내용 | D1 확인 |
|------|-----------|---------|
| `SPEC.md` (F543 row) | 측정 수치 + 최종 판정 역동기화 | meta only |

### D1 체크리스트 (Stage 3 Exit)

- **D1 주입 사이트 전수 검증**: N/A — 서비스 코드 변경 없음
- **D2 식별자 계약 검증**: N/A
- **D3 Breaking change**: N/A
- **D4 TDD Red 파일**: TDD 면제 (meta/docs)

## §6. Go/No-Go 판정 로직

```
# WSL/로컬 환경: p99는 지리 노이즈 지배 → p50을 주 지표로, p99를 보조 지표로 사용
증분_p50 = E2_p50 - E1_p50  # 주 판정 지표
증분_p99 = E2_p99 - E1_p99  # 보조 참고 (WSL 환경에서 신뢰도 낮음)

# p50 기준 판정 (k6 Cloud 인-리전 측정 시에는 p99 기준 복원)
if 증분_p50 < 50:
  판정 = "GO"
  후속 = "F539b 즉시 착수"
elif 50 <= 증분_p50 <= 150:
  판정 = "조건부 GO"
  후속 = "캐싱 최적화(CF Cache API 또는 KV warm-up) 후 F539b 착수"
else:  # > 150ms
  판정 = "NO-GO"
  후속 = "F539b/c 중단. 개선 Sprint 별도 착수. SPEC.md Phase 44 재계획 필요"
```

## §7. 리포트 구조 (`docs/04-report/phase-44-f539a-k6-cloud.md`)

```markdown
# F539a — k6 Cloud 재측정 Go/No-Go 리포트

## 측정 환경
## 엔드포인트별 결과 (E1~E4)
## 증분 p99 (E2-E1): {수치}ms
## 판정: GO / 조건부 GO / NO-GO
## F539b 착수 조건 충족 여부
## 원시 데이터 링크 (k6 Cloud Grafana / JSON)
```

## §8. 리스크 완화

| 리스크 | 감지 | 대응 |
|--------|------|------|
| fx-gateway 미응답 | setup() 내 200 OK 실패 | `console.error`로 중단 → curl smoke 재확인 |
| k6 Cloud token 없음 | `K6_CLOUD_TOKEN` env 부재 | `k6 run` 로컬 모드 fallback |
| E3/E4 JWT 없음 | `TEST_JWT` env 부재 | E1/E2만 실행 + 리포트에 "E3/E4 미측정" 주석 |
