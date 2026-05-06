---
code: FX-DSGN-353
title: Sprint 353 — F629 5-Asset Model + System Knowledge Design
version: 1.0
status: Active
category: DESIGN
created: 2026-05-06
updated: 2026-05-06
sprint: 353
f_item: F629
req: FX-REQ-694
priority: P2
---

# Sprint 353 — F629 5-Asset Model + System Knowledge Design

## §1 목표

4-Asset(Policy/Ontology/Skill/Log) → **5-Asset Model** 확장. `system_knowledge` (암묵지 파일) 자산을 `core/asset/` 신규 도메인으로 신설한다.

BeSir §0.1: "메타는 파일(Git), 인스턴스는 PG" → D1은 메타 카탈로그, 실제 컨텐츠는 Git path(content_ref).

## §2 아키텍처 결정

| 결정 | 선택 | 근거 |
|------|------|------|
| 위치 | `core/asset/` 별 도메인 | 5-Asset 통합 sub-app, 명확한 우권 분리 |
| 분량 | Minimal (types + D1 + service stub + route stub) | 5-Asset catalog endpoint는 F600 5-Layer 통합 시 |
| sub-app 패턴 | `Hono` (non-OpenAPI) | verification/docs 패턴 일치 |
| re-export | types.ts에 스키마/서비스 re-export | F609 패턴 일관성 |

## §3 DB 스키마

**마이그레이션**: `0142_system_knowledge.sql`

```sql
CREATE TABLE system_knowledge (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'system_knowledge',
  title TEXT NOT NULL,
  content_ref TEXT NOT NULL,
  content_type TEXT NOT NULL,
  metadata TEXT,
  created_by TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  CHECK (asset_type = 'system_knowledge'),
  CHECK (content_type IN ('sop','transcript','knowledge_graph_input','domain_rule','tacit_knowledge'))
);
CREATE INDEX idx_system_knowledge_org_type ON system_knowledge(org_id, content_type);
CREATE INDEX idx_system_knowledge_created ON system_knowledge(created_at DESC);
```

## §4 테스트 계약 (TDD Red Target)

**파일**: `packages/api/src/core/asset/services/system-knowledge.service.test.ts`

| ID | 테스트 | 입력 | 기대 출력 |
|----|--------|------|----------|
| T1 | registerKnowledge D1 INSERT 호출 | orgId+title+contentRef+contentType | db.prepare 1회 호출 |
| T2 | registerKnowledge 반환값 검증 | 동일 입력 | id/orgId/assetType/title/contentRef 정확 |
| T3 | getKnowledge D1 SELECT 호출 | id | db.prepare 1회 호출 |
| T4 | getKnowledge 없으면 null 반환 | 없는 id | null |

## §5 파일 매핑

### 신규 파일

| 파일 | 역할 |
|------|------|
| `packages/api/src/db/migrations/0142_system_knowledge.sql` | D1 migration |
| `packages/api/src/core/asset/types.ts` | ASSET_TYPES + SystemKnowledgeAsset + re-export |
| `packages/api/src/core/asset/schemas/asset.ts` | Zod 스키마 4종 |
| `packages/api/src/core/asset/services/system-knowledge.service.ts` | SystemKnowledgeService (stub) |
| `packages/api/src/core/asset/services/system-knowledge.service.test.ts` | TDD 테스트 |
| `packages/api/src/core/asset/routes/index.ts` | Hono sub-app (POST /system-knowledge + GET /system-knowledge/:id) |

### 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `packages/api/src/app.ts` | `import { assetApp }` + `app.route("/api/asset", assetApp)` 추가 |

## §6 데이터 흐름

```
POST /api/asset/system-knowledge
  → assetApp (Hono)
  → SystemKnowledgeService.registerKnowledge()
  → D1 INSERT system_knowledge
  → 201 { id, orgId, assetType, title, ... }

GET /api/asset/system-knowledge/:id
  → assetApp (Hono)
  → SystemKnowledgeService.getKnowledge(id)
  → D1 SELECT system_knowledge WHERE id = ?
  → 200 { ... } or 404
```

## §7 MSA 경계

- `core/asset/` 는 독립 도메인 (다른 core/* import 없음)
- `app.ts`에서 `app.route("/api/asset", assetApp)` 1줄로 mount
- types.ts는 외부에서 import 가능한 계약 (F609 패턴)
