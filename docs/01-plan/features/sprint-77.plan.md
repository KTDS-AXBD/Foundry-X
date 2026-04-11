---
code: FX-PLAN-077
title: "Sprint 77 — F224~F228 Ecosystem Reference 5건"
version: "1.0"
status: Active
category: PLAN
created: 2026-03-30
updated: 2026-03-30
author: Claude (Autopilot)
references:
  - "[[FX-PLAN-012]] Phase 6 Ecosystem Integration"
  - "[[FX-REQ-216]] SM→Dev 컨텍스트 전달 구조"
  - "[[FX-REQ-217]] 슬래시 커맨드 UX"
  - "[[FX-REQ-218]] Party Mode (다중 에이전트 세션)"
  - "[[FX-REQ-219]] Spec Library 구조"
  - "[[FX-REQ-220]] Expansion Packs 모델"
---

# Sprint 77 Plan — F224~F228 Ecosystem Reference

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | Phase 6 벤치마킹(BMAD/OpenSpec)에서 발견한 5가지 패턴(컨텍스트 전달, 커맨드 UX, 멀티 에이전트 세션, 스펙 라이브러리, 확장팩)이 Foundry-X의 기존 기능(F142, F225 IDE 통합, F147, F46, F152)과 연결점이 있지만, 적용 방안이 구체적으로 정의되지 않았다. |
| **Solution** | 각 Reference를 API 레이어로 구현: 컨텍스트 전달 엔진(F224), 커맨드 레지스트리(F225), 파티 세션 매니저(F226), 스펙 라이브러리 서비스(F227), 확장팩 매니저(F228). 기존 서비스를 확장하되, 독립적인 ecosystem 레이어를 추가한다. |
| **Function/UX Effect** | 에이전트가 Sprint 실행 시 자동으로 관련 컨텍스트를 수신하고, 슬래시 커맨드로 도구에 접근하며, 다중 에이전트가 동시 토론하고, 스펙을 라이브러리에서 재사용하며, 도메인 확장팩으로 기능을 패키징할 수 있다. |
| **Core Value** | BMAD/OpenSpec 벤치마킹 2차 결실 — 기존 Agent Evolution 기능을 ecosystem 수준으로 확장하는 Reference 구현체를 확보한다. |

---

## 1. Overview

### 1.1 Purpose

Phase 6 Ecosystem Integration의 두 번째 물결로, Sprint 75/76에서 구현한 Brownfield Init(F220), Changes Directory(F222), Agent-as-Code(F221), Doc Sharding(F223)에 이어 5개 Reference 항목을 API 서비스로 구현한다.

### 1.2 Background

- **Sprint 75**: F220(Brownfield Init) + F222(Changes Directory) ✅
- **Sprint 76**: F221(Agent-as-Code) + F223(Doc Sharding) ✅
- **FX-PLAN-012**: BMAD/OpenSpec 벤치마킹 기반 Ecosystem Integration PRD
- 모든 항목이 P3 Reference — 기존 기능 연결 + 향후 적용 기반 확보

### 1.3 Related Documents

- PRD: `docs/specs/FX-SPEC-PRD-V8_foundry-x.md`
- Phase 6 PRD: FX-PLAN-012
- Sprint 75 Plan/Design: FX-PLAN-075, FX-DSGN-075
- Sprint 76 Plan/Design: FX-PLAN-076, FX-DSGN-076

---

## 2. Scope

### 2.1 In Scope

#### F224: SM→Dev 컨텍스트 전달 구조 (FX-REQ-216, P3)

BMAD Story 파일 기반 컨텍스트 전달 방식을 참고하여, Sprint 워크플로우(F142) 실행 시 SM→Dev 컨텍스트를 구조화한다.

- [ ] `ContextPassthrough` 타입 정의 — source, target, payload, format
- [ ] `context-passthrough.ts` 서비스 — 컨텍스트 패키징 + 전달 + 수신 확인
- [ ] `context-passthrough.ts` 라우트 — 컨텍스트 CRUD + 워크플로우 연동
- [ ] `context-passthrough.ts` Zod 스키마
- [ ] 테스트: 서비스 + 라우트

#### F225: 슬래시 커맨드 UX (FX-REQ-217, P3)

OpenSpec `/opsx:` 커맨드 패턴을 참고하여 네임스페이스 기반 커맨드 레지스트리를 구현한다.

- [ ] `CommandRegistry` 타입 정의 — namespace, command, handler, args schema
- [ ] `command-registry.ts` 서비스 — 커맨드 등록/조회/실행/네임스페이스 관리
- [ ] `command-registry.ts` 라우트 — 커맨드 CRUD + 실행
- [ ] `command-registry.ts` Zod 스키마
- [ ] 테스트: 서비스 + 라우트

#### F226: Party Mode (FX-REQ-218, P3)

BMAD 자유형 토론을 참고하여 다중 에이전트 동시 세션(Party Mode)을 구현한다.

- [ ] `PartySession` 타입 정의 — session, participants, messages, mode
- [ ] `party-session.ts` 서비스 — 세션 생성/참가/발언/종합/종료
- [ ] `party-session.ts` 라우트 — 세션 CRUD + 참가자 관리
- [ ] `party-session.ts` Zod 스키마
- [ ] D1 마이그레이션 0063 — `party_sessions` + `party_messages` 테이블
- [ ] 테스트: 서비스 + 라우트

#### F227: Spec Library 구조 (FX-REQ-219, P3)

OpenSpec 기능 단위 스펙 조직 방식을 참고하여 스펙 라이브러리를 구현한다.

- [ ] `SpecLibraryItem` 타입 정의 — category, tags, content, version
- [ ] `spec-library.ts` 서비스 — 스펙 등록/검색/버전관리/태그
- [ ] `spec-library.ts` 라우트 — 스펙 CRUD + 검색 + 카테고리
- [ ] `spec-library.ts` Zod 스키마
- [ ] D1 마이그레이션 0064 — `spec_library` 테이블
- [ ] 테스트: 서비스 + 라우트

#### F228: Expansion Packs 모델 (FX-REQ-220, P3)

BMAD 도메인 확장 패키징/배포 방식을 참고하여 Expansion Pack 매니저를 구현한다.

- [ ] `ExpansionPack` 타입 정의 — manifest, components, dependencies, version
- [ ] `expansion-pack.ts` 서비스 — 팩 등록/설치/제거/버전 관리
- [ ] `expansion-pack.ts` 라우트 — 팩 CRUD + 설치/제거
- [ ] `expansion-pack.ts` Zod 스키마
- [ ] D1 마이그레이션 0065 — `expansion_packs` + `pack_installations` 테이블
- [ ] 테스트: 서비스 + 라우트

### 2.2 Out of Scope

- F229~F231 (Sprint 78 Watch 항목)
- 실시간 WebSocket 통신 (Party Mode는 폴링 방식)
- CLI 직접 연동 (API 레이어만 구현)
- Web 대시보드 UI 변경

---

## 3. Technical Approach

### 3.1 아키텍처

기존 패턴 유지: Service → Route → Schema 3-tier + D1 SQLite.

```
packages/api/src/
├── db/migrations/
│   ├── 0063_party_sessions.sql       # F226
│   ├── 0064_spec_library.sql         # F227
│   └── 0065_expansion_packs.sql      # F228
├── services/
│   ├── context-passthrough.ts        # F224
│   ├── command-registry.ts           # F225
│   ├── party-session.ts              # F226
│   ├── spec-library.ts               # F227
│   └── expansion-pack.ts             # F228
├── schemas/
│   ├── context-passthrough.ts        # F224
│   ├── command-registry.ts           # F225
│   ├── party-session.ts              # F226
│   ├── spec-library.ts               # F227
│   └── expansion-pack.ts             # F228
├── routes/
│   ├── context-passthrough.ts        # F224
│   ├── command-registry.ts           # F225
│   ├── party-session.ts              # F226
│   ├── spec-library.ts               # F227
│   └── expansion-pack.ts             # F228
└── __tests__/
    ├── context-passthrough.test.ts   # F224
    ├── context-passthrough-route.test.ts
    ├── command-registry.test.ts      # F225
    ├── command-registry-route.test.ts
    ├── party-session.test.ts         # F226
    ├── party-session-route.test.ts
    ├── spec-library.test.ts          # F227
    ├── spec-library-route.test.ts
    ├── expansion-pack.test.ts        # F228
    └── expansion-pack-route.test.ts
```

### 3.2 D1 마이그레이션 전략

- F224/F225: DB 불필요 (메모리/in-flight 서비스) 또는 기존 테이블 활용
- F226: `party_sessions` + `party_messages` (0063)
- F227: `spec_library` (0064)
- F228: `expansion_packs` + `pack_installations` (0065)

### 3.3 기존 기능 연결

| F-item | 참고 패턴 | 연결 기존 기능 | 확장 방식 |
|--------|-----------|---------------|-----------|
| F224 | BMAD Story | F142 WorkflowEngine | 워크플로우 실행 컨텍스트에 passthrough 추가 |
| F225 | OpenSpec `/opsx:` | MCP 프로토콜 | 네임스페이스 기반 커맨드 레지스트리 |
| F226 | BMAD Party | F147 EnsembleVoting | 세션 기반 다중 에이전트 토론 |
| F227 | OpenSpec Spec | F46 WikiSync | 기능 단위 스펙 저장소 |
| F228 | BMAD Expansion | F152 Marketplace | 도메인별 확장팩 패키징 |

---

## 4. Estimation

| F-item | 서비스 | 라우트 | 스키마 | 마이그레이션 | 테스트 |
|--------|--------|--------|--------|-------------|--------|
| F224 | 1 | 1 | 1 | 0 | 2 |
| F225 | 1 | 1 | 1 | 0 | 2 |
| F226 | 1 | 1 | 1 | 1 | 2 |
| F227 | 1 | 1 | 1 | 1 | 2 |
| F228 | 1 | 1 | 1 | 1 | 2 |
| **합계** | **5** | **5** | **5** | **3** | **10** |

예상 엔드포인트: ~30개 (5 기능 × ~6 CRUD)
예상 테스트: ~80개 (서비스 ~8/기능 + 라우트 ~8/기능)

---

## 5. Worker 파일 매핑 (병렬 구현용)

### Worker 1: F224 + F225 (DB 불필요, 독립)
- `packages/api/src/services/context-passthrough.ts`
- `packages/api/src/services/command-registry.ts`
- `packages/api/src/schemas/context-passthrough.ts`
- `packages/api/src/schemas/command-registry.ts`
- `packages/api/src/routes/context-passthrough.ts`
- `packages/api/src/routes/command-registry.ts`
- `packages/api/src/__tests__/context-passthrough.test.ts`
- `packages/api/src/__tests__/context-passthrough-route.test.ts`
- `packages/api/src/__tests__/command-registry.test.ts`
- `packages/api/src/__tests__/command-registry-route.test.ts`

### Worker 2: F226 + F227 + F228 (DB 마이그레이션 포함)
- `packages/api/src/db/migrations/0063_party_sessions.sql`
- `packages/api/src/db/migrations/0064_spec_library.sql`
- `packages/api/src/db/migrations/0065_expansion_packs.sql`
- `packages/api/src/services/party-session.ts`
- `packages/api/src/services/spec-library.ts`
- `packages/api/src/services/expansion-pack.ts`
- `packages/api/src/schemas/party-session.ts`
- `packages/api/src/schemas/spec-library.ts`
- `packages/api/src/schemas/expansion-pack.ts`
- `packages/api/src/routes/party-session.ts`
- `packages/api/src/routes/spec-library.ts`
- `packages/api/src/routes/expansion-pack.ts`
- `packages/api/src/__tests__/party-session.test.ts`
- `packages/api/src/__tests__/party-session-route.test.ts`
- `packages/api/src/__tests__/spec-library.test.ts`
- `packages/api/src/__tests__/spec-library-route.test.ts`
- `packages/api/src/__tests__/expansion-pack.test.ts`
- `packages/api/src/__tests__/expansion-pack-route.test.ts`

### 통합 (리더)
- `packages/api/src/index.ts` — 라우트 등록
- `packages/shared/src/types.ts` — 공유 타입 추가 (필요 시)
- `packages/api/src/__tests__/helpers/test-db.ts` — 마이그레이션 SQL 추가
