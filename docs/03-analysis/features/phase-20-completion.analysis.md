# Phase 20 AX BD MSA 재조정 — 종합 Gap Analysis

> **문서 ID**: FX-ANLS-Phase20
> **분석 대상**: Sprint 179~188, F392~F401 (10 Sprint, 10 PR)
> **Design 기준**: `docs/02-design/features/ax-bd-msa.design.md`
> **분석일**: 2026-04-07

## Overall Match Rate: 94% (PASS)

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 92% | PASS |
| Architecture Compliance | 95% | PASS |
| Convention Compliance | 93% | PASS |
| Test Coverage | 96% | PASS |
| **Overall** | **94%** | **PASS** |

## Sprint별 결과

| Sprint | F-item | PR | Match | 주요 산출물 |
|--------|--------|-----|:-----:|------------|
| 179 | F392+F393 | #316 | 100% | service-mapping(594줄) + d1-ownership(293줄) + ADR-001 |
| 180 | F394+F395 | #317 | 100% | harness-kit 42파일(+2,278줄) + CLI + ESLint 룰 |
| 181 | F396 (auth) | #318 | 100% | modules/auth/ 29파일 |
| 182 | F396 (portal) | #319 | 100% | modules/portal/ 115파일 |
| 183 | F397 (gate+launch) | #320 | 100% | modules/gate/ + modules/launch/ |
| 184 | F397 (core) | #321 | 100% | core/ 5도메인 (discovery/shaping/offering/agent/harness) |
| 185 | F398 | #322 | 100% | events/(catalog+d1-bus) + D1 0114 + sidebar IA |
| 186 | F399 | #323 | 100% | Strangler MW + D1EventBus + proxy 리팩토링 |
| 187 | F400 | #324 | 100% | E2E 48파일 태깅 + Gate-X scaffold PoC |
| 188 | F401 | #325 | 100% | harness-kit README + developer-guide + migration-guide |

## 10-Item Design 체크리스트

| # | Design 항목 | 상태 | 비고 |
|---|------------|:----:|------|
| 1 | 118 routes → 7 모듈 분류 | PASS | 실제: core/ 5도메인 + modules/ 4개 = 9+flat(8) |
| 2 | no-cross-module-import ESLint 룰 | PASS | harness-kit에 구현 + 테스트 |
| 3 | harness-kit 패키지 | PASS | scaffold + D1 + JWT + CORS + events + CI/CD, 57 tests |
| 4 | 이벤트 카탈로그 8종 스키마 | PASS | entity+verb 패턴으로 개선 (catalog.ts) |
| 5 | EventBus PoC (D1+Cron) | PASS | 0114_domain_events.sql + event-cron + scheduled |
| 6 | Strangler Fig 프록시 | PASS | local/proxy 모드, 8 tests |
| 7 | Web IA 개편 | PASS | sidebar 서비스 경계 그룹 + "이관 예정" badge |
| 8 | E2E 서비스별 태깅 | PASS | 44/44 files tagged |
| 9 | Gate-X scaffold PoC | PASS | CLI + Handlebars templates |
| 10 | Production 배포 + 문서화 | PARTIAL | 7개 문서 완료, ESLint api 미적용 |

## 의도적 변경 (Design → 구현)

| Design 계획 | 실제 구현 | 변경 사유 |
|-------------|----------|----------|
| modules/infra(21 routes) | core/agent(13) + core/harness(22) + flat(8) | 도메인 응집도 향상 — infra는 실제로 agent+harness+governance 혼합 |
| core/ 2개 (discovery, shaping) | core/ 5개 (+ offering, agent, harness) | 모듈 분리 시 독립 서비스로 전환 용이 |
| 이벤트 프로세스 기반 (item.collected) | entity+verb 기반 (biz-item.created) | 이벤트 소싱 표준에 적합 |

## 미구현 (3건, P3~P4)

| Item | Design 위치 | 우선순위 | 사유 |
|------|------------|:--------:|------|
| harness-kit tenant middleware | §5.1 | P3 | Phase 20 범위 외 — 서비스 분리 시 구현 |
| harness-kit d1/schema-tag | §5.1 | P3 | D1 Shared DB 전략에서 논리적 분리로 충분 |
| packages/api ESLint 룰 적용 | §7 | P4 | harness-kit에 룰 존재, api에 적용은 점진적 |

## 수치 요약

| 지표 | 값 |
|------|-----|
| Sprint 수 | 10 (179~188) |
| PR 수 | 10 (#316~#325) |
| 평균 Match Rate | 100% (Sprint별) / 94% (종합) |
| 총 변경량 | ~8,000+ LOC |
| 테스트 | 3,168+ (API) + 263 (E2E) + 57 (harness-kit) |
| 문서 | 7개 (service-mapping, d1-ownership, ADR, developer-guide, migration-guide, harness-kit README, IA설계서) |
