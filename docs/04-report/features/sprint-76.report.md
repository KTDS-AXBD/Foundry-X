---
code: FX-RPRT-076
title: "Sprint 76 완료 보고서 — F221 Agent-as-Code + F223 문서 Sharding"
version: "1.0"
status: Active
category: RPRT
created: 2026-03-30
updated: 2026-03-30
author: Claude (Autopilot)
references:
  - "[[FX-PLAN-076]] Sprint 76 Plan"
  - "[[FX-DSGN-076]] Sprint 76 Design"
  - "[[FX-REQ-213]] Agent-as-Code 선언적 정의"
  - "[[FX-REQ-215]] 문서 Sharding 자동화"
---

# Sprint 76 완료 보고서

## Executive Summary

| 항목 | 값 |
|------|-----|
| **Feature** | F221 Agent-as-Code 선언적 정의 + F223 문서 Sharding |
| **Sprint** | 76 |
| **기간** | 2026-03-30 (단일 세션) |
| **Match Rate** | **100%** (Design ↔ 구현 완전 일치) |
| **테스트** | 1857/1857 통과 (신규 58개 포함) |
| **타입체크** | ✅ 우리 파일 0 error |

### Value Delivered

| 관점 | 내용 |
|------|------|
| **문제** | 에이전트 정의가 코드 내 하드코딩에 의존, 대형 문서를 에이전트에 그대로 전달하면 컨텍스트 윈도우 낭비 |
| **해결** | YAML/JSON 선언적 에이전트 정의 + Markdown 자동 분할 → 에이전트별 관련 섹션만 제공 |
| **기능적 UX** | YAML import/export로 에이전트 역할을 버전 관리 가능, shard API로 에이전트 맞춤 문서 제공 |
| **핵심 가치** | "Git이 진실" 철학 강화 — 에이전트 정의도 코드처럼 관리, 문서 Sharding으로 AI 효율 최적화 |

## 구현 결과

### F221: Agent-as-Code 선언적 정의

| 산출물 | 파일 | 비고 |
|--------|------|------|
| D1 마이그레이션 | `0061_agent_definitions.sql` | ALTER TABLE × 4 컬럼 |
| Zod 스키마 | `schemas/agent-definition.ts` | 6개 스키마 |
| 서비스 | `services/agent-definition-loader.ts` | 간이 YAML 파서 + 검증 + export |
| 서비스 확장 | `services/custom-role-manager.ts` | import/export + 인터페이스 확장 |
| 라우트 | `routes/agent-definition.ts` | 3 엔드포인트 |
| 테스트 | `__tests__/agent-definition-loader.test.ts` | 23 테스트 |
| 테스트 | `__tests__/agent-definition-route.test.ts` | 7 테스트 |

**엔드포인트 (3개)**:
- `POST /api/agent-definitions/import` — YAML/JSON → D1
- `GET /api/agent-definitions/:roleId/export` — D1 → YAML/JSON
- `GET /api/agent-definitions/schema` — 스키마 메타 정보

### F223: 문서 Sharding

| 산출물 | 파일 | 비고 |
|--------|------|------|
| D1 마이그레이션 | `0062_document_shards.sql` | CREATE TABLE + 2 인덱스 |
| Zod 스키마 | `schemas/shard-doc.ts` | 3개 스키마 |
| 서비스 | `services/shard-doc.ts` | ShardDocService (파싱+매칭+CRUD) |
| 라우트 | `routes/shard-doc.ts` | 4 엔드포인트 |
| 테스트 | `__tests__/shard-doc.test.ts` | 21 테스트 |
| 테스트 | `__tests__/shard-doc-route.test.ts` | 7 테스트 |

**엔드포인트 (4개)**:
- `POST /api/shard-doc` — 문서 → shard 분할
- `GET /api/shard-doc/:documentId` — 문서별 shard 목록
- `GET /api/shard-doc/agent/:agentRole` — 에이전트별 관련 shard
- `DELETE /api/shard-doc/:documentId` — shard 삭제

## 수치 변동

| 지표 | 이전 | 이후 | 변동 |
|------|------|------|------|
| API 엔드포인트 | ~315 | ~322 | +7 |
| API 서비스 | 136 | 138 | +2 |
| API 스키마 | 62 | 64 | +2 |
| API 테스트 | 1803 | 1857 | +54 |
| D1 마이그레이션 | 0001~0060 | 0001~0062 | +2 |

## 기술 결정

1. **YAML 파서 자체 구현**: Workers 환경 번들 크기 제한으로 외부 `yaml` 패키지 대신 간이 파서 구현. 에이전트 정의에 필요한 YAML subset만 지원.
2. **ALTER TABLE vs 별도 테이블**: 1:1 관계이므로 JOIN 비용 회피를 위해 기존 테이블 확장 선택.
3. **키워드 기반 매칭**: 초기 버전은 정적 키워드 맵 사용. 향후 임베딩 기반 매칭으로 전환 가능.

## 리스크/기술부채

- (없음) — 깨끗한 구현, pre-existing ambiguity.test.ts 실패는 모듈 해석 이슈로 Sprint 76과 무관.
