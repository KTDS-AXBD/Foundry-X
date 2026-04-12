---
code: FX-PLAN-076
title: "Sprint 76 — F221 Agent-as-Code 선언적 정의 + F223 문서 Sharding"
version: "1.0"
status: Active
category: PLAN
created: 2026-03-30
updated: 2026-03-30
author: Claude (Autopilot)
references:
  - "[[FX-REQ-213]] Agent-as-Code 선언적 정의"
  - "[[FX-REQ-215]] 문서 Sharding 자동화"
  - "[[FX-PLAN-012]] Phase 6 Ecosystem Integration"
---

# Sprint 76 Plan — F221 Agent-as-Code + F223 문서 Sharding

## 1. 목표

BMAD 프레임워크의 `.agent.yaml` 패턴과 `shard-doc` 개념을 Foundry-X에 적용한다.
에이전트를 YAML/JSON으로 선언적 정의하고, 대형 문서를 에이전트별 관련 섹션으로 자동 분할한다.

## 2. 범위

### In-Scope

#### F221: Agent-as-Code 선언적 정의 (FX-REQ-213, P1)

| 항목 | 설명 |
|------|------|
| **D1 스키마 확장** | `custom_agent_roles`에 `persona`, `dependencies`, `customization_schema`, `menu_config` 컬럼 추가 (0061 migration) |
| **YAML 파서 서비스** | `agent-definition-loader.ts` — YAML/JSON 에이전트 정의 파싱 + 유효성 검증 |
| **Import/Export API** | YAML ↔ D1 양방향 변환 엔드포인트 |
| **Zod 스키마** | `AgentDefinitionSchema` — persona/dependencies/customization/menu 구조 정의 |

#### F223: 문서 Sharding (FX-REQ-215, P2)

| 항목 | 설명 |
|------|------|
| **ShardDoc 서비스** | `shard-doc.ts` — Markdown 문서를 섹션별로 파싱, 에이전트 역할과 매칭 |
| **컨텍스트 분배 API** | 에이전트 ID로 관련 문서 섹션만 조회하는 엔드포인트 |
| **D1 테이블** | `document_shards` — 원본 문서 참조, 섹션 인덱스, 에이전트 매핑 (0062 migration) |
| **Zod 스키마** | `DocumentShardSchema`, `ShardQuerySchema` |

### Out-of-Scope

- 에이전트 마켓플레이스 연동 (F152 별도)
- 실시간 문서 변경 감지 (향후 Watch 기능)
- CLI 에이전트 정의 파일 자동 생성 (Sprint 77 F224 컨텍스트 전달과 연계)

## 3. 기술 접근

### 3.1 F221 — Agent-as-Code

**YAML 에이전트 정의 구조** (BMAD `.agent.yaml` 참고):

```yaml
name: reviewer
persona: |
  You are a senior code reviewer focused on OWASP security patterns
  and TypeScript best practices.
dependencies:
  - eslint
  - prettier
  - ast-grep
customization:
  severity_threshold: warning
  max_review_comments: 20
  focus_areas:
    - security
    - performance
menu:
  - action: review-pr
    label: "PR 리뷰"
    description: "풀 리퀘스트 코드 리뷰 실행"
  - action: scan-security
    label: "보안 스캔"
    description: "OWASP Top 10 취약점 검사"
```

**D1 확장** (0061 migration):
- `persona TEXT DEFAULT ''` — 에이전트 성격/역할 상세 프롬프트
- `dependencies TEXT DEFAULT '[]'` — 필요 도구/패키지 JSON 배열
- `customization_schema TEXT DEFAULT '{}'` — 사용자 설정 가능한 파라미터 JSON
- `menu_config TEXT DEFAULT '[]'` — 에이전트 메뉴 항목 JSON 배열

**서비스 계층**:
1. `agent-definition-loader.ts` — YAML 파싱 (`yaml` npm 패키지 활용) + Zod 검증
2. `custom-role-manager.ts` 확장 — `importFromYaml()`, `exportToYaml()` 메서드

### 3.2 F223 — 문서 Sharding

**Sharding 전략**:
1. Markdown `##` 헤딩 기준으로 섹션 분할
2. 각 섹션에 키워드 추출 → 에이전트 `taskType` + `allowedTools`와 매칭
3. 매칭 결과를 `document_shards` 테이블에 저장
4. 에이전트 조회 시 관련 shard만 반환

**D1 테이블** (0062 migration):
```sql
CREATE TABLE document_shards (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,         -- 원본 문서 식별자
  document_title TEXT NOT NULL,      -- 원본 문서 제목
  section_index INTEGER NOT NULL,    -- 섹션 순서
  heading TEXT NOT NULL,             -- 섹션 헤딩
  content TEXT NOT NULL,             -- 섹션 내용
  keywords TEXT NOT NULL DEFAULT '[]', -- 추출된 키워드 JSON
  agent_roles TEXT NOT NULL DEFAULT '[]', -- 매칭된 에이전트 역할 JSON
  org_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## 4. 의존성

| 의존 대상 | 관계 |
|-----------|------|
| F146 custom_agent_roles (Sprint 41) | F221 D1 확장 기반 |
| F152 Agent Marketplace (Sprint 42) | F221 YAML 정의가 marketplace 게시 후보 |
| yaml npm 패키지 | F221 YAML 파서 (devDep) |

## 5. 구현 파일 매핑

### Worker 1: F221 Agent-as-Code

| 파일 | 작업 |
|------|------|
| `packages/api/src/db/migrations/0061_agent_definitions.sql` | D1 마이그레이션 — persona, dependencies, customization_schema, menu_config 컬럼 추가 |
| `packages/api/src/services/agent-definition-loader.ts` | YAML/JSON 파서 + Zod 검증 서비스 |
| `packages/api/src/services/custom-role-manager.ts` | importFromYaml/exportToYaml 메서드 추가 |
| `packages/api/src/schemas/agent-definition.ts` | AgentDefinitionSchema, ImportExport 스키마 |
| `packages/api/src/routes/agent-definition.ts` | CRUD + import/export 라우트 |
| `packages/api/src/__tests__/agent-definition-loader.test.ts` | 서비스 테스트 |
| `packages/api/src/__tests__/agent-definition-route.test.ts` | 라우트 테스트 |

### Worker 2: F223 Doc Sharding

| 파일 | 작업 |
|------|------|
| `packages/api/src/db/migrations/0062_document_shards.sql` | D1 마이그레이션 — document_shards 테이블 |
| `packages/api/src/services/shard-doc.ts` | 문서 파싱 + 섹션 분할 + 키워드 추출 + 에이전트 매칭 |
| `packages/api/src/schemas/shard-doc.ts` | DocumentShardSchema, ShardQuerySchema |
| `packages/api/src/routes/shard-doc.ts` | shard CRUD + 에이전트별 조회 라우트 |
| `packages/api/src/__tests__/shard-doc.test.ts` | 서비스 테스트 |
| `packages/api/src/__tests__/shard-doc-route.test.ts` | 라우트 테스트 |

## 6. 성공 기준

| 지표 | 목표 |
|------|------|
| 타입체크 | ✅ 0 errors |
| 테스트 | ✅ 신규 테스트 전체 통과 |
| YAML→D1 round-trip | ✅ import→export→import 동일성 보장 |
| Shard 매칭 정확도 | ≥ 80% (키워드 기반 기본 매칭) |
| Match Rate (Gap 분석) | ≥ 90% |

## 7. 리스크

| 리스크 | 영향 | 완화 |
|--------|------|------|
| YAML 파서 번들 크기 | Workers 1MB 제한 | `yaml` 패키지 경량 (~100KB), tree-shake 가능 |
| 키워드 매칭 정확도 | 잘못된 shard 분배 | 초기 매칭은 키워드 기반, 향후 임베딩 전환 가능 |
| D1 마이그레이션 0061/0062 | 0040 중복 전례 | 번호 고정, 원자적 커밋 |
