---
code: FX-PLAN-S184
title: "Sprint 184 — F397 Foundry-X 코어 정리 (core/ 5개 도메인 분류)"
version: 1.0
status: Active
category: PLAN
created: 2026-04-07
updated: 2026-04-07
author: Sinclair Seo
---

# Sprint 184 Plan — Foundry-X 코어 정리

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Sprint 181~183에서 auth/portal/gate/launch 39 routes를 modules/로 이동했으나, flat routes/ 79개 + services/ 204개 + schemas/ 96개가 여전히 미분류 상태 |
| **Solution** | 나머지 파일을 core/ 5개 도메인(discovery, shaping, offering, agent, harness)으로 분류 + 공유 인프라 9개는 flat 잔류 |
| **Function/UX Effect** | 도메인별 독립 개발/테스트 가능, MSA 전환 시 서비스 경계 명확 |
| **Core Value** | Phase 20-A M2 모듈화 완성 — "모든 라우트/서비스가 core/ 또는 modules/에 분류됨" 기준 달성 |

---

## 1. Scope

### 1.1 F-item

| F-item | 설명 | Sprint 범위 |
|--------|------|-------------|
| F397 | Foundry-X 코어 정리 — core/ 5개 도메인 분류 + 의존성 정리 | Sprint 184 (183에서 계속) |

> Sprint 181: Auth → modules/auth/ ✅
> Sprint 182: Portal → modules/portal/ ✅
> Sprint 183: Gate + Launch → modules/gate/ + modules/launch/ ✅
> **Sprint 184: 나머지 70 routes → core/ 5개 도메인 (본 Sprint)**

### 1.2 Core 도메인 분류 (Routes 70개 + flat 잔류 9개 = 79개)

| 도메인 | Routes | 설명 |
|--------|--------|------|
| core/discovery | 12 | AX BD 발굴 (S1-S2): biz-items, collection, discovery-*, ax-bd-discovery/ideas/artifacts, ir-proposals |
| core/shaping | 14 | 형상화 (S3): shaping, ax-bd-bmc/agent/comments/history/insights/links/viability/prototypes/skills/persona-eval/progress, persona-configs/evals |
| core/offering | 10 | Offering Pipeline: offerings, offering-*, content-adapter, design-tokens, bdp, methodology |
| core/agent | 13 | Agent/Orchestration: agent*, orchestration, execution-events, task-state, command-registry, context-passthrough, workflow, captured/derived-engine, skill-* |
| core/harness | 21 | Harness/SDD/Governance: harness, governance, guard-rail, audit, backup-restore, ogd-*, quality-*, integrity, freshness, health, roi-benchmark, prototype-*, hitl-review, user-evaluations, builder, mcp, expansion-pack, ax-bd-kg |
| **flat (잔류)** | **9** | proxy, help-agent, requirements, spec, spec-library, shard-doc, sr, entities, discovery-shape-pipeline |

### 1.3 연관 Services/Schemas

Routes와 동일 도메인에 속하는 services/schemas도 함께 이동. 이름 패턴 기반 매핑.

### 1.4 Out of Scope

- modules/ (auth/portal/gate/launch) 재구조화
- D1 테이블 물리적 분리 — Phase 20-B 범위
- 테스트 파일 이동 — 기존 위치 유지 (import 경로만 업데이트)

---

## 2. Implementation Strategy

Sprint 181~183 패턴 동일 적용:

1. **core/ 디렉토리 생성**: `core/{discovery,shaping,offering,agent,harness}/{routes,services,schemas}/`
2. **파일 이동**: `git mv` 사용 (이력 보존)
3. **인덱스 생성**: 각 `core/*/index.ts` (라우트 re-export)
4. **core/index.ts 생성**: 전체 core export 통합
5. **app.ts 갱신**: core/index.ts에서 import → 기존 routes/ import 제거
6. **import 경로 수정**: 이동된 파일 내부 상대 경로 업데이트
7. **검증**: typecheck + lint + test 통과

---

## 3. Risk & Mitigation

| 리스크 | 영향 | 완화 |
|--------|------|------|
| 파일 수 대규모 (70+ routes + 200+ services) | import 경로 누락 다수 | typecheck 반복 실행, sed 일괄 치환 |
| 크로스 도메인 서비스 참조 | 순환 의존성 | 공유 서비스는 flat 잔류, core 내부만 이동 |
| app.ts 대규모 리팩토링 | 라우트 등록 누락 | core/index.ts re-export 패턴으로 일원화 |
| 테스트 import 깨짐 | test 실패 | 테스트의 상대 import 경로 일괄 수정 |

---

## 4. Definition of Done

- [ ] core/ 5개 도메인 디렉토리 + index.ts 생성
- [ ] Routes 70개 → core/ 이동 완료
- [ ] Services/Schemas → core/ 도메인별 이동 완료
- [ ] app.ts에서 core/index.ts 통합 import
- [ ] flat routes/ 에는 공유 인프라 9개만 잔류
- [ ] `turbo typecheck` 통과
- [ ] `pnpm test` 통과 (api 패키지)
- [ ] `turbo lint` 통과
