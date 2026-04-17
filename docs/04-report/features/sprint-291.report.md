---
id: FX-REPORT-291
sprint: 291
feature: F543
date: 2026-04-14
author: Sinclair Seo
status: DONE
---

# Sprint 291 Report — F543: Phase 44 gating latency 벤치마크

## §1 요약

| 항목 | 값 |
|------|-----|
| Sprint | 291 |
| Feature | F543 — Phase 44 gating latency 벤치마크 |
| Status | ✅ DONE |
| Match Rate | 100% (6/6 파일) |
| 판정 | **CONDITIONAL GO** (F538 착수 승인) |

## §2 구현 내용

### 생성 파일

| 파일 | 역할 |
|------|------|
| `benchmarks/phase-44-latency/k6-health.js` | k6 Health 엔드포인트 시나리오 |
| `benchmarks/phase-44-latency/k6-items.js` | k6 Items 엔드포인트 시나리오 |
| `benchmarks/phase-44-latency/run.sh` | k6 실행 래퍼 + 결과 저장 |
| `benchmarks/phase-44-latency/curl-bench.sh` | curl 대안 (k6 미설치 환경) |
| `benchmarks/phase-44-latency/README.md` | 실행 가이드 |
| `docs/04-report/features/phase-44-latency-decision.md` | **Go/No-Go 판정 리포트** |

### 실측 결과 (WSL Korea → Cloudflare Workers)

| 엔드포인트 | 경로 | p50 | avg | 비고 |
|-----------|------|-----|-----|------|
| Health | direct | 556ms | 571ms | Service Binding 없음 |
| Health | via gateway | 564ms | 595ms | **+8ms (binding overhead)** |
| Items | direct | 706ms | 774ms | D1 포함 |
| Items | via gateway | 720ms | 762ms | **+14ms (binding overhead)** |

**Service Binding 오버헤드**: p50 기준 ~10-14ms. 허용 범위 내.

## §3 판정 근거

- 절대 p99 (1600ms+): WSL Korea 지리적 레이턴시 지배 — Service Binding 비용 아님
- Service Binding 증분 (~10ms): Cloudflare 내부 호출로 프로덕션에서는 <5ms 예상
- Architecture 검증: fx-gateway → fx-discovery Service Binding 경로 정상 동작 확인

## §4 후속 조치

- **F538 착수 승인** (Discovery 완전 분리)
- F539 전 k6 Cloud 재측정 권장 (인-리전 p99 검증)

## §5 TDD

벤치마크 스크립트는 tdd-workflow.md 면제 대상 (측정 도구, 로직 테스트 불필요).
실행 검증: curl-bench.sh 실제 실행으로 30샘플 × 2 엔드포인트 측정 완료.

## §6 갭 분석

| # | Design 항목 | 구현 | 상태 |
|---|------------|------|------|
| 1 | k6-health.js | ✅ | PASS |
| 2 | k6-items.js | ✅ | PASS |
| 3 | run.sh | ✅ | PASS |
| 4 | curl-bench.sh | ✅ | PASS |
| 5 | README.md | ✅ | PASS |
| 6 | 판정 리포트 | ✅ | PASS |

**Match Rate: 100%**
