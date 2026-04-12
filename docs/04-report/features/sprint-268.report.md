---
id: FX-REPORT-268
type: report
sprint: 268
phase: 38
features: [F517, F518, F520]
status: done
date: 2026-04-12
match_rate: 100%
---

# Sprint 268 Report — MSA Walking Skeleton

## 요약

| 항목 | 결과 |
|------|------|
| Sprint | 268 |
| Features | F517, F518, F520 |
| Match Rate | 100% (8/8) |
| Test | 6/6 PASS (fx-gateway 4, fx-discovery 2) |
| Typecheck | 13/13 PASS (turbo) |

## 구현 내용

### F517 — API Gateway Worker (`fx-gateway`)

**핵심 설계 결정: 환경변수 스위치 기반 라우팅**

```
DISCOVERY_ENABLED=false(기본) → /api/discovery/* → MAIN_API (기존 api)
DISCOVERY_ENABLED=true       → /api/discovery/* → DISCOVERY binding (fx-discovery)
                               /api/*           → MAIN_API (항상)
```

배포 없이 `DISCOVERY_ENABLED=true` 한 줄로 트래픽 전환 및 즉시 롤백 가능.

**신규 파일**: `packages/fx-gateway/` (6 source + 2 config + 1 test + 1 vitest)

### F518 — Discovery Worker (`fx-discovery`)

Walking Skeleton 범위: **경계 선언 수준** (완전 코드 분리 아님)

배경: Discovery 도메인이 shaping/offering/agent/collection 5개 도메인에 걸쳐
**30개 이상 cross-domain import**를 가짐 — 완전 분리는 Sprint 1개 범위 초과.

구현된 것:
- `packages/fx-discovery/` 패키지 빌드 인프라
- `/api/discovery/health` stub endpoint (PASS)
- `wrangler.toml` + D1 바인딩 설정

fx-gateway의 DISCOVERY_ENABLED 스위치로 언제든지 트래픽 전환 가능한 구조.

### F520 — D1 바인딩 전략

**옵션 B 채택**: 동일 `foundry-x-db` 공유, Discovery 소유 테이블 문서화.

```sql
-- 0127_discovery_worker_comment.sql (no-op)
-- Discovery 소유: biz_items, discovery_stages, discovery_reports,
--                 discovery_criteria, analysis_contexts, pipeline_events, pipeline_stages
```

완전한 DB 격리(옵션 A)는 데이터 마이그레이션 + cross-JOIN 대체 필요 → Phase 38.2 이후.

## Gap Analysis

| # | 항목 | 결과 |
|---|------|------|
| 1 | fx-gateway 패키지 존재 | PASS |
| 2 | fx-gateway typecheck PASS | PASS |
| 3 | fx-discovery 패키지 존재 | PASS |
| 4 | fx-discovery typecheck PASS | PASS |
| 5 | Gateway 라우팅 테스트 (4/4) | PASS |
| 6 | Discovery health 테스트 (2/2) | PASS |
| 7 | D1 migration 0127 작성 | PASS |
| 8 | 기존 api 테스트 regression 없음 | PASS |

**Match Rate: 100%**

## 의도적 제외 (Phase 38.2~38.3)

| 항목 | 이연 이유 | 예정 |
|------|-----------|------|
| Discovery routes 완전 이동 | cross-domain import 30개+ — 대형 리팩토링 | Phase 38.2 |
| D1 완전 격리 (옵션 A) | 데이터 마이그레이션 + JOIN 대체 필요 | Phase 38.3 |
| Service Binding 실제 트래픽 전환 | fx-discovery가 stub — routes 완성 후 | Phase 38.2 이후 |

## Walking Skeleton 증명 결과

- Gateway가 Discovery를 독립 Worker로 라우팅할 수 있는 **구조** 확보 ✅
- `DISCOVERY_ENABLED=true` 활성화 + fx-discovery에 실제 routes 연결 시 즉시 전환 가능 ✅
- 기존 foundry-x-api는 변경 없이 MAIN_API binding으로 동작 유지 ✅

## 다음 단계 (Phase 38.2)

1. Discovery cross-domain import 30개 분석 및 분리 가능한 서비스 목록 작성
2. biz-items, discovery-stages 등 핵심 routes를 fx-discovery로 이동
3. DISCOVERY_ENABLED=true 활성화하여 실제 트래픽 전환
4. D1 완전 격리 옵션 A 검토 (Phase 38.3)
