---
id: FX-PLAN-294
feature: F539a — k6 Cloud 재측정 + Go/No-Go 판정
sprint: 294
date: 2026-04-15
status: ACTIVE
prd: docs/specs/fx-gateway-cutover/prd-final.md
req: FX-REQ-576
priority: P0
---

# Sprint 294 Plan — F539a (k6 Cloud 재측정 + Go/No-Go 판정)

## 목표

F543 CONDITIONAL GO 조건 A2 해소: k6 Cloud Seoul 인-리전 재측정으로  
Service Binding 증분 p99 판정을 완결하고 F539b 착수 Go/No-Go를 결정한다.

## 배경 및 맥락

- F543(Sprint 291): WSL Korea curl 기반 측정 → p50 +10~14ms. p99 미증명(지리 노이즈).
- PRD §4.1 A2 조건: k6 Cloud Seoul 리전 재측정 후 p99 < 50ms이면 Go 확정.
- 기존 `benchmarks/phase-44-latency/` 스크립트: 단일 엔드포인트, 소규모 부하 프로파일.

## 범위

### In-Scope

| ID | 작업 | AC |
|----|------|----|
| F539a-1 | k6 Cloud Seoul 리전 4 엔드포인트(E1~E4) 측정 | k6 Cloud run 완료 or fallback 결과 |
| F539a-2 | 부하 프로파일: 30s ramp-up → 2m×20 VU → 30s×50 VU spike → 1m recover → 30s ramp-down | k6 script 옵션 반영 |
| F539a-3 | Go/No-Go 리포트 작성 (`docs/04-report/phase-44-f539a-k6-cloud.md`) | 증분 p99 + 판정 |
| F539a-4 | F543 비고 역동기화 | SPEC.md F543 row 수치 추가 |

### 4 엔드포인트 정의

| ID | 경로 | 설명 |
|----|------|------|
| E1 | `GET /api/health` via `foundry-x-api.ktds-axbd.workers.dev` | 직접 (packages/api) — D1 없음 |
| E2 | `GET /api/discovery/health` via `fx-gateway.ktds-axbd.workers.dev` | Service Binding 경유 — D1 없음 |
| E3 | `GET /api/discovery/items?limit=10` via `fx-gateway.ktds-axbd.workers.dev` | Service Binding + D1 쿼리 |
| E4 | `GET /api/discovery/items?limit=10` via `foundry-x-api.ktds-axbd.workers.dev` | 직접 (packages/api) — D1 포함 |

**Go 기준**: 증분 p99 = E2 - E1 (Service Binding 오버헤드, DB 없음 순수 오버헤드)
- < 50ms: **Go** → F539b 즉시 착수
- 50~150ms: **조건부 Go** → 캐싱 최적화 후 F539b 착수
- \> 150ms: **No-Go** → F539b 중단

### Out-of-Scope

- fx-gateway 프로덕션 배포 (F539b)
- 7 라우트 Service Binding 이전 (F539c)
- packages/api 코드 변경 없음

## 접근 전략

### Primary: k6 Cloud (grafana.com)

1. `benchmarks/phase-44-latency/k6-cloud.js` 신규 스크립트 — 4 엔드포인트 + PRD 부하 프로파일
2. k6 Cloud API token 설정 + Seoul 리전 실행
3. Grafana report 링크 캡처

### Fallback: GCP Seoul VM (k6 Cloud 미사용 시)

1. GCP Compute Engine `asia-northeast3` (Seoul) 단기 인스턴스
2. k6 로컬 실행으로 동일 부하 프로파일 재현
3. 결과를 JSON으로 저장

### Fallback 2: 정밀 curl (Seoul Proxy 없는 경우)

1. 기존 curl-bench.sh 확장 — 샘플 100+, 분산 측정
2. "WSL 지리 노이즈 제거 불가" 전제로 상대값 기준 판정

## 산출물

| 파일 | 설명 |
|------|------|
| `benchmarks/phase-44-latency/k6-cloud.js` | k6 Cloud 4 엔드포인트 스크립트 |
| `docs/04-report/phase-44-f539a-k6-cloud.md` | Go/No-Go 판정 리포트 |
| SPEC.md (F543 비고 역동기화) | p99 수치 + 최종 판정 |

## 의존성

- fx-gateway Worker: `fx-gateway.ktds-axbd.workers.dev` (F520/F521 Walking Skeleton, ✅)
- foundry-x-api Worker: `foundry-x-api.ktds-axbd.workers.dev` (always-on, ✅)
- fx-discovery binding: `fx-gateway`에 fx-discovery Service Binding 설정 (F521 ✅)

## TDD 적용 여부

F539a는 서비스 로직 변경 없음 (k6 스크립트 + 리포트 문서). **TDD 면제** (tdd-workflow.md §적용범위: meta/docs 면제).

## 리스크

| 리스크 | 대응 |
|--------|------|
| k6 Cloud 무료 50VU 제한 | Fallback: 20 VU로 spike 단계 축소 |
| fx-gateway 미배포 상태 | `curl /api/discovery/health` smoke 선확인 |
| Seoul 리전 인스턴스 부재 | Fallback 2 적용 + "지리 노이즈 포함" 주석 |
