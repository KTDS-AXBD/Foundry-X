---
code: FX-ANLS-GATE-X
title: Phase 21 Gate-X Gap Analysis
version: 1.0
status: Active
created: 2026-04-07
updated: 2026-04-07
---

# Phase 21 Gate-X — Design vs Implementation Gap Analysis

## Overview

| Item | Value |
|------|-------|
| Feature | Gate-X 독립 서비스 (F402~F413) |
| Sprints | 189~197 (8 Sprints) |
| Design Docs | gate-x.design.md, sprint-193/194/196.design.md |
| Implementation | packages/gate-x/, packages/gate-x-sdk/ |
| **Overall Match Rate** | **92%** |

## Category Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| API Endpoint Match | 88% | WARN |
| Data Model Match | 95% | PASS |
| Service Layer Match | 93% | PASS |
| Queue/DO Architecture Match | 90% | PASS |
| SDK/CLI Match | 92% | PASS |
| Test Coverage | 90% | PASS |
| Convention Compliance | 95% | PASS |

## Sprint-by-Sprint Match

| Sprint | F-items | Match | Notes |
|--------|---------|:-----:|-------|
| 189 | F402+F403 | 90% | Gate 모듈 추출, 테이블 재구성 |
| 190 | F404+F405 | 85% | Queue/DO OK, auth/token 미구현, DLQ 미설정 |
| 191 | F406 | 95% | 이벤트 연동 |
| 192 | F407+F408 | 95% | Web UI + 다중 AI |
| 193 | F409 | 100% | 커스텀 룰 엔진 완벽 일치 |
| 194 | F410 | 90% | 웹훅+테넌트 OK, evaluation dispatch 미연결 |
| 195 | F411 | 93% | 과금 체계 |
| 196 | F412 | 95% | SDK/CLI, 인증 헤더 방식만 변경 |
| 197 | F413 | 95% | 수집 코드 격리 |

## Missing (Design O, Implementation X) — 3건

1. **`POST /v1/auth/token`** — JWT 토큰 자체 발급 미구현 (외부 JWT 의존)
2. **evaluation-service → webhook dispatch** — 검증 완료 시 웹훅 발송 미연결
3. **DLQ 설정** — wrangler.toml dead_letter_queue 미설정

## Changed (Design != Implementation) — 의도적 개선 10건

- API prefix: `/v1/` → `/api/` (버전 관리 전략 변경)
- 네이밍: GateXEnv→GateEnv, ValidationSession→OgdCoordinator
- tenant_id → org_id
- Queue/DO 네이밍: VALIDATION_→OGD_
- SDK 인증: X-API-Key → Authorization: Bearer

## Added (Implementation only) — 8건

- biz_items, pipeline_stages, ax_evaluation_kpis, domain_events, api_key_usage 테이블
- services/adapters/ 패턴
- /api/ogd/jobs/:id/result 엔드포인트
- SDK EvaluationHistory/Portfolio 타입

## Test Summary

| Package | Files | Tests |
|---------|:-----:|:-----:|
| gate-x | 12 | ~131 |
| gate-x-sdk | 2 | ~38 |
| **Total** | **14** | **~169** |

## Verdict

**PASS (92%)** — Design 역갱신 권장 (의도적 변경 반영). 핵심 누락 3건은 후속 또는 Design 조정으로 해소 가능.
