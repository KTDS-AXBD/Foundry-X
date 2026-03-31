---
code: FX-DSGN-S92
title: "Sprint 92 — GIVC Ontology PoC 1차 (KG 스키마 + 샘플 데이터 + 질의 API)"
version: 1.0
status: Draft
category: DSGN
created: 2026-03-31
updated: 2026-03-31
author: Sinclair Seo
references: "[[FX-PLAN-S92]], [[FX-SPEC-001]], [[FX-DSGN-S91]]"
---

# Sprint 92 Design: GIVC Ontology PoC 1차 — KG 스키마 + 샘플 데이터 + 질의 API

## §1 개요

D1(SQLite) 위에 Property Graph 패턴으로 산업 공급망 지식그래프를 구현한다.
GIVC 2,443개 품목의 인과관계를 표현하기 위해 노드-엣지-속성 3-테이블 구조를 설계하고,
석유화학·반도체 공급 체인 샘플 데이터를 로드한 뒤 경로 탐색 + 영향 전파 API를 제공한다.

### 핵심 원칙
- **D1 인프라 활용**: 전용 Graph DB 없이 기존 D1에 KG 테이블 추가
- **Property Graph 패턴**: nodes + edges + properties 3-테이블로 유연한 그래프 모델링
- **PoC 규모**: ~50 노드, ~80 엣지 (본사업 2,443개 전체 매핑은 Sprint 93+)
- **기존 BD 섹션 확장**: `/ax-bd/ontology` 페이지로 진입

## §2 D1 스키마

### 마이그레이션: `0076_kg_ontology.sql`

```sql
-- KG 노드 (엔터티)
CREATE TABLE IF NOT EXISTS kg_nodes (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  type TEXT NOT NULL,         -- PRODUCT | INDUSTRY | COUNTRY | COMPANY | TECHNOLOGY | RESEARCH | EVENT | ALERT
  name TEXT NOT NULL,
  name_en TEXT,               -- 영문명 (선택)
  description TEXT,
  metadata TEXT DEFAULT '{}', -- JSON: 품목코드, 산업분류코드, 국가코드 등
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kg_nodes_org ON kg_nodes(org_id);
CREATE INDEX IF NOT EXISTS idx_kg_nodes_type ON kg_nodes(org_id, type);
CREATE INDEX IF NOT EXISTS idx_kg_nodes_name ON kg_nodes(org_id, name);

-- KG 엣지 (관계)
CREATE TABLE IF NOT EXISTS kg_edges (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL REFERENCES kg_nodes(id),
  target_node_id TEXT NOT NULL REFERENCES kg_nodes(id),
  relation_type TEXT NOT NULL, -- SUPPLIES | BELONGS_TO | PRODUCED_IN | PRODUCED_BY | USES_TECH | RESEARCHED_BY | AFFECTED_BY | WARNED_BY | SUBSTITUTES | COMPETES_WITH
  weight REAL DEFAULT 1.0,    -- 영향도 가중치 (0.0~1.0)
  label TEXT,                 -- 관계 설명 (예: "원재료 공급")
  metadata TEXT DEFAULT '{}', -- JSON: 추가 속성
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kg_edges_org ON kg_edges(org_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_source ON kg_edges(org_id, source_node_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_target ON kg_edges(org_id, target_node_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_relation ON kg_edges(org_id, relation_type);

-- KG 속성 (확장 속성 — EAV 패턴)
CREATE TABLE IF NOT EXISTS kg_properties (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,  -- 'node' | 'edge'
  entity_id TEXT NOT NULL,    -- kg_nodes.id 또는 kg_edges.id 참조
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'string', -- string | number | boolean | json
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_kg_props_entity ON kg_properties(entity_type, entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kg_props_unique ON kg_properties(entity_type, entity_id, key);
```

### 노드 타입 정의

| Type | 설명 | metadata 예시 |
|------|------|-------------|
| PRODUCT | 품목 (중심 엔터티) | `{"givcCode":"GVC20101MS001","hsCode":"2709"}` |
| INDUSTRY | 산업 분류 | `{"sicCode":"3674","category":"반도체"}` |
| COUNTRY | 국가 | `{"iso":"KR","region":"Asia"}` |
| COMPANY | 기업 | `{"bizNo":"123-45-67890"}` |
| TECHNOLOGY | 기술 | `{"level":"공정","parent":"반도체제조"}` |
| RESEARCH | R&D 과제 | `{"projectId":"R202501234"}` |
| EVENT | 글로벌 이벤트 | `{"eventType":"conflict","severity":"high","date":"2026-01"}` |
| ALERT | EWS 경보 | `{"alertLevel":"warning","source":"EWS"}` |

### 관계 타입 정의

| Relation | Source → Target | weight 기본값 | 설명 |
|----------|----------------|-------------|------|
| SUPPLIES | PRODUCT → PRODUCT | 0.8 | 공급 체인 (원재료 → 가공품) |
| BELONGS_TO | PRODUCT → INDUSTRY | 1.0 | 품목이 속한 산업 |
| PRODUCED_IN | PRODUCT → COUNTRY | 1.0 | 생산 국가 |
| PRODUCED_BY | PRODUCT → COMPANY | 1.0 | 생산 기업 |
| USES_TECH | PRODUCT → TECHNOLOGY | 0.9 | 사용 기술 |
| RESEARCHED_BY | PRODUCT → RESEARCH | 0.7 | 관련 R&D |
| AFFECTED_BY | PRODUCT → EVENT | 가변 | 이벤트 영향 |
| WARNED_BY | PRODUCT → ALERT | 가변 | 경보 연결 |
| SUBSTITUTES | PRODUCT → PRODUCT | 0.5 | 대체 관계 |
| COMPETES_WITH | COMPANY → COMPANY | 0.6 | 경쟁 관계 |

## §3 API 서비스 설계

### 3.1 KgNodeService (`services/kg-node.ts`)

```typescript
export interface KgNode {
  id: string;
  orgId: string;
  type: KgNodeType;
  name: string;
  nameEn?: string;
  description?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type KgNodeType =
  | "PRODUCT" | "INDUSTRY" | "COUNTRY" | "COMPANY"
  | "TECHNOLOGY" | "RESEARCH" | "EVENT" | "ALERT";
```

| 메서드 | 설명 |
|--------|------|
| `create(data, orgId)` | 노드 생성 |
| `getById(id, orgId)` | 단일 노드 조회 |
| `list(orgId, filters?)` | 노드 목록 (타입/이름 필터, 페이지네이션) |
| `update(id, data, orgId)` | 노드 수정 |
| `delete(id, orgId)` | 노드 삭제 (연결된 엣지도 cascade) |
| `search(orgId, query)` | 이름 LIKE 검색 |

### 3.2 KgEdgeService (`services/kg-edge.ts`)

```typescript
export interface KgEdge {
  id: string;
  orgId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: KgRelationType;
  weight: number;
  label?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type KgRelationType =
  | "SUPPLIES" | "BELONGS_TO" | "PRODUCED_IN" | "PRODUCED_BY"
  | "USES_TECH" | "RESEARCHED_BY" | "AFFECTED_BY" | "WARNED_BY"
  | "SUBSTITUTES" | "COMPETES_WITH";
```

| 메서드 | 설명 |
|--------|------|
| `create(data, orgId)` | 엣지 생성 |
| `getById(id, orgId)` | 단일 엣지 조회 |
| `getNeighbors(nodeId, orgId, direction?)` | 이웃 노드 조회 (outgoing/incoming/both) |
| `delete(id, orgId)` | 엣지 삭제 |
| `listByNode(nodeId, orgId)` | 노드에 연결된 모든 엣지 |

### 3.3 KgQueryService (`services/kg-query.ts`)

그래프 탐색 및 영향 전파 서비스.

```typescript
export interface PathResult {
  path: KgNode[];           // 경로상의 노드 목록
  edges: KgEdge[];          // 경로상의 엣지 목록
  totalWeight: number;       // 경로 가중치 합
  hopCount: number;
}

export interface ImpactNode {
  node: KgNode;
  impactLevel: "HIGH" | "MEDIUM" | "LOW";
  impactScore: number;       // 0.0~1.0
  pathFromSource: string[];  // 노드 ID 경로
  hopCount: number;
}

export interface ImpactResult {
  sourceNode: KgNode;
  affectedNodes: ImpactNode[];
  totalAffected: number;
  byLevel: { high: number; medium: number; low: number };
}
```

| 메서드 | 설명 |
|--------|------|
| `findPath(sourceId, targetId, orgId, maxDepth?)` | 두 노드 간 최단 경로 (BFS) |
| `findAllPaths(sourceId, targetId, orgId, maxDepth?)` | 모든 경로 (DFS, max 10개) |
| `propagateImpact(sourceId, orgId, options?)` | 영향 전파 시뮬레이션 |
| `getSubgraph(nodeId, orgId, depth?)` | 특정 노드 중심 서브그래프 |
| `getStats(orgId)` | KG 통계 (노드/엣지 수, 타입별 분포) |

**영향 전파 알고리즘:**

```
function propagateImpact(sourceId, orgId, options):
  decayFactor = options.decayFactor ?? 0.7
  threshold = options.threshold ?? 0.1
  maxDepth = options.maxDepth ?? 5

  queue = [(sourceId, 1.0, 0)]   // (nodeId, score, depth)
  visited = Set()
  results = []

  while queue not empty:
    (currentId, score, depth) = queue.dequeue()
    if currentId in visited or depth > maxDepth or score < threshold:
      continue
    visited.add(currentId)

    node = getNode(currentId)
    level = score >= 0.7 ? "HIGH" : score >= 0.3 ? "MEDIUM" : "LOW"
    results.push({ node, impactLevel: level, impactScore: score, hopCount: depth })

    neighbors = getNeighbors(currentId, orgId, "outgoing")
    for (neighbor, edge) in neighbors:
      nextScore = score * edge.weight * decayFactor
      queue.enqueue((neighbor.id, nextScore, depth + 1))

  return results (sorted by score desc)
```

### 3.4 KgSeedService (`services/kg-seed.ts`)

샘플 데이터 시드 서비스. 석유화학 + 반도체 공급 체인 데이터를 D1에 로드한다.

| 메서드 | 설명 |
|--------|------|
| `seedPetrochemicalChain(orgId)` | 석유화학 체인 ~30 노드, ~45 엣지 |
| `seedSemiconductorChain(orgId)` | 반도체 체인 ~20 노드, ~35 엣지 |
| `seedEvents(orgId)` | 글로벌 이벤트 5개 + 영향 엣지 |
| `seedAll(orgId)` | 전체 시드 실행 |
| `clearAll(orgId)` | 전체 KG 데이터 삭제 |

## §4 API 라우트 설계

### `routes/ax-bd-kg.ts`

| Method | Path | 설명 | 응답 |
|--------|------|------|------|
| **노드** | | | |
| POST | `/ax-bd/kg/nodes` | 노드 생성 | `KgNode` |
| GET | `/ax-bd/kg/nodes` | 노드 목록 (필터+페이지네이션) | `{ items: KgNode[], total }` |
| GET | `/ax-bd/kg/nodes/:id` | 노드 상세 | `KgNode` |
| PATCH | `/ax-bd/kg/nodes/:id` | 노드 수정 | `KgNode` |
| DELETE | `/ax-bd/kg/nodes/:id` | 노드 삭제 | `{ ok: true }` |
| GET | `/ax-bd/kg/nodes/search` | 노드 검색 | `{ items: KgNode[] }` |
| **엣지** | | | |
| POST | `/ax-bd/kg/edges` | 엣지 생성 | `KgEdge` |
| GET | `/ax-bd/kg/nodes/:id/neighbors` | 이웃 노드 | `{ nodes: KgNode[], edges: KgEdge[] }` |
| DELETE | `/ax-bd/kg/edges/:id` | 엣지 삭제 | `{ ok: true }` |
| **질의** | | | |
| GET | `/ax-bd/kg/path` | 경로 탐색 | `{ paths: PathResult[] }` |
| POST | `/ax-bd/kg/impact` | 영향 전파 시뮬레이션 | `ImpactResult` |
| GET | `/ax-bd/kg/subgraph/:nodeId` | 서브그래프 | `{ nodes: KgNode[], edges: KgEdge[] }` |
| GET | `/ax-bd/kg/stats` | KG 통계 | `KgStats` |
| **시드** | | | |
| POST | `/ax-bd/kg/seed` | 샘플 데이터 시드 | `{ ok: true, nodes, edges }` |
| DELETE | `/ax-bd/kg/seed` | 시드 데이터 삭제 | `{ ok: true }` |

쿼리 파라미터 (노드 목록):
- `type?: KgNodeType` — 타입 필터
- `q?: string` — 이름 검색
- `page?: number` (default 1)
- `limit?: number` (default 20, max 100)

경로 탐색 쿼리:
- `source: string` — 시작 노드 ID
- `target: string` — 끝 노드 ID
- `maxDepth?: number` (default 5, max 10)

영향 전파 바디:
```json
{
  "sourceNodeId": "node-xxx",
  "decayFactor": 0.7,
  "threshold": 0.1,
  "maxDepth": 5,
  "relationTypes": ["SUPPLIES"]  // 선택: 특정 관계만 탐색
}
```

## §5 Zod 스키마 (`schemas/kg-ontology.schema.ts`)

```typescript
import { z } from "zod";

const kgNodeTypes = [
  "PRODUCT", "INDUSTRY", "COUNTRY", "COMPANY",
  "TECHNOLOGY", "RESEARCH", "EVENT", "ALERT",
] as const;

const kgRelationTypes = [
  "SUPPLIES", "BELONGS_TO", "PRODUCED_IN", "PRODUCED_BY",
  "USES_TECH", "RESEARCHED_BY", "AFFECTED_BY", "WARNED_BY",
  "SUBSTITUTES", "COMPETES_WITH",
] as const;

export const createNodeSchema = z.object({
  type: z.enum(kgNodeTypes),
  name: z.string().min(1).max(200),
  nameEn: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const nodeQuerySchema = z.object({
  type: z.enum(kgNodeTypes).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createEdgeSchema = z.object({
  sourceNodeId: z.string().min(1),
  targetNodeId: z.string().min(1),
  relationType: z.enum(kgRelationTypes),
  weight: z.number().min(0).max(1).default(1.0),
  label: z.string().max(200).optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

export const pathQuerySchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  maxDepth: z.coerce.number().int().min(1).max(10).default(5),
});

export const impactBodySchema = z.object({
  sourceNodeId: z.string().min(1),
  decayFactor: z.number().min(0.1).max(1.0).default(0.7),
  threshold: z.number().min(0).max(1).default(0.1),
  maxDepth: z.number().int().min(1).max(10).default(5),
  relationTypes: z.array(z.enum(kgRelationTypes)).optional(),
});
```

## §6 Web UI 설계

### 6.1 컴포넌트 구조

```
packages/web/src/
├── routes/ax-bd/
│   └── ontology.tsx              # KG 탐색기 페이지
├── components/feature/kg/
│   ├── KgNodeSearch.tsx          # 노드 검색 + 타입 필터
│   ├── KgNodeDetail.tsx          # 노드 상세 + 이웃 목록
│   ├── KgPathResult.tsx          # 경로 탐색 결과 리스트
│   └── KgImpactResult.tsx        # 영향 전파 결과 (H/M/L 뱃지)
└── lib/
    └── api-client.ts             # (기존) fetchApi + KG 타입 추가
```

### 6.2 KgNodeSearch

- 상단 검색바: 텍스트 입력 + 타입 드롭다운 필터 (8개 타입)
- 검색 결과: 카드 리스트 (이름, 타입 뱃지, 설명 미리보기)
- 카드 클릭 시 `KgNodeDetail` 표시

### 6.3 KgNodeDetail

- 노드 기본 정보 (이름, 타입, 설명, metadata)
- 이웃 노드 테이블 (outgoing/incoming 탭, 관계 타입 + weight 표시)
- "영향 분석" 버튼 → `KgImpactResult` 모달
- "경로 탐색" 입력 → 대상 노드 선택 후 `KgPathResult`

### 6.4 KgPathResult

- 시작 → 끝 경로를 스텝 리스트로 표현:
  ```
  원유 —[SUPPLIES 0.8]→ 나프타 —[SUPPLIES 0.9]→ 에틸렌 —[SUPPLIES 0.8]→ PE
  ```
- 복수 경로 시 탭 또는 아코디언으로 표시
- 각 노드 클릭 시 해당 노드 상세로 이동

### 6.5 KgImpactResult

- 영향 전파 결과를 영향도 순으로 정렬
- 각 노드: 이름 + 타입 뱃지 + 영향도 뱃지 (HIGH=빨강, MEDIUM=주황, LOW=초록) + hop 수
- 상단 요약: 전체 영향 노드 수 + HIGH/MEDIUM/LOW 분포
- "경로 보기" 클릭 시 소스→해당 노드 경로 표시

### 6.6 사이드바 메뉴

기존 BD 섹션에 추가:
```
AX Business Development
├── 아이디어
├── BMC
├── Discovery
├── 스킬 카탈로그
├── 프로세스 가이드
├── 산출물
├── 진행 추적
└── 🆕 Ontology    ← 신규
```

## §7 Shared 타입 (`packages/shared/src/kg.ts`)

```typescript
export type KgNodeType =
  | "PRODUCT" | "INDUSTRY" | "COUNTRY" | "COMPANY"
  | "TECHNOLOGY" | "RESEARCH" | "EVENT" | "ALERT";

export type KgRelationType =
  | "SUPPLIES" | "BELONGS_TO" | "PRODUCED_IN" | "PRODUCED_BY"
  | "USES_TECH" | "RESEARCHED_BY" | "AFFECTED_BY" | "WARNED_BY"
  | "SUBSTITUTES" | "COMPETES_WITH";

export type ImpactLevel = "HIGH" | "MEDIUM" | "LOW";

export interface KgNodeSummary {
  id: string;
  type: KgNodeType;
  name: string;
  nameEn?: string;
}

export interface KgEdgeSummary {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: KgRelationType;
  weight: number;
  label?: string;
}

export const KG_NODE_TYPE_LABELS: Record<KgNodeType, string> = {
  PRODUCT: "품목",
  INDUSTRY: "산업",
  COUNTRY: "국가",
  COMPANY: "기업",
  TECHNOLOGY: "기술",
  RESEARCH: "R&D 과제",
  EVENT: "이벤트",
  ALERT: "경보",
};

export const KG_RELATION_TYPE_LABELS: Record<KgRelationType, string> = {
  SUPPLIES: "공급",
  BELONGS_TO: "소속",
  PRODUCED_IN: "생산국",
  PRODUCED_BY: "생산기업",
  USES_TECH: "사용기술",
  RESEARCHED_BY: "연구",
  AFFECTED_BY: "영향",
  WARNED_BY: "경보",
  SUBSTITUTES: "대체",
  COMPETES_WITH: "경쟁",
};
```

## §8 샘플 데이터 상세

### 8.1 석유화학 공급 체인 (30 노드, 45 엣지)

**PRODUCT 노드 (18개):**
원유, 나프타, 에틸렌, 프로필렌, 벤젠, 부타디엔, 폴리에틸렌(PE), 폴리프로필렌(PP), 폴리스티렌(PS), 합성고무(SBR), ABS수지, PET수지, 합성섬유(나일론), 자동차내장재, 타이어, 의료기기부품, 포장필름, 건축자재

**INDUSTRY 노드 (4개):** 석유화학, 자동차, 의료기기, 건설

**COUNTRY 노드 (4개):** 한국, 사우디아라비아, 미국, 중국

**EVENT 노드 (2개):** 중동분쟁(severity:high), EU탄소국경조정(severity:medium)

**COMPANY 노드 (2개):** LG화학, 롯데케미칼

### 8.2 반도체 공급 체인 (20 노드, 35 엣지)

**PRODUCT 노드 (12개):**
실리콘웨이퍼, 포토마스크, 포토레지스트, 네온가스, 불화수소, 에칭가스, 다이, 리드프레임, 패키징기판, 메모리칩(DRAM), 메모리칩(NAND), AP칩

**INDUSTRY 노드 (2개):** 반도체, 전자부품

**COUNTRY 노드 (2개):** 일본, 대만 (한국은 공유)

**EVENT 노드 (2개):** 일본수출규제(severity:high), 대만지진(severity:medium)

**TECHNOLOGY 노드 (2개):** 노광공정, 에칭공정

## §9 테스트 설계

### API 테스트 (~45개)

| 파일 | 테스트 수 | 범위 |
|------|---------|------|
| `kg-node.test.ts` | 10 | CRUD, 검색, 타입 필터, 페이지네이션 |
| `kg-edge.test.ts` | 8 | CRUD, 이웃 조회, cascade 삭제 |
| `kg-query.test.ts` | 12 | BFS 경로, DFS 경로, 영향 전파, 서브그래프, 통계 |
| `kg-seed.test.ts` | 5 | 시드 실행, 데이터 검증, 삭제 |
| `kg-ontology.route.test.ts` | 10 | 라우트 통합, 인증, 유효성 검증 |

### Web 테스트 (~15개)

| 파일 | 테스트 수 | 범위 |
|------|---------|------|
| `KgNodeSearch.test.tsx` | 4 | 검색 입력, 타입 필터, 결과 렌더링 |
| `KgNodeDetail.test.tsx` | 4 | 노드 정보, 이웃 목록, 버튼 동작 |
| `KgPathResult.test.tsx` | 3 | 경로 스텝, 복수 경로 |
| `KgImpactResult.test.tsx` | 4 | 영향도 뱃지, 요약, 정렬 |

## §10 구현 순서

| 순서 | 작업 | 의존성 |
|------|------|--------|
| 1 | Shared: `kg.ts` 타입 정의 | 없음 |
| 2 | D1: `0076_kg_ontology.sql` 마이그레이션 | 없음 |
| 3 | API: `kg-node.ts` 서비스 + 테스트 | 1, 2 |
| 4 | API: `kg-edge.ts` 서비스 + 테스트 | 3 |
| 5 | API: `kg-query.ts` 서비스 + 테스트 | 3, 4 |
| 6 | API: `kg-seed.ts` 서비스 + 테스트 | 3, 4 |
| 7 | API: `kg-ontology.schema.ts` Zod 스키마 | 1 |
| 8 | API: `kg-ontology.ts` 라우트 + 등록 + 테스트 | 3~7 |
| 9 | Web: `KgNodeSearch` + `KgNodeDetail` | 8 |
| 10 | Web: `KgPathResult` + `KgImpactResult` | 8 |
| 11 | Web: `ontology.tsx` 페이지 + 사이드바 | 9, 10 |
| 12 | Web: 컴포넌트 테스트 | 9, 10, 11 |

## §11 Worker 파일 매핑

단일 구현 (Worker 분리 불필요 — 파일 간 의존성이 높음):

| 파일 그룹 | 예상 파일 수 | 설명 |
|----------|-----------|------|
| Shared | 1 | kg.ts |
| D1 Migration | 1 | 0076_kg_ontology.sql |
| API Services | 4 | kg-node, kg-edge, kg-query, kg-seed |
| API Schema | 1 | kg-ontology.schema.ts |
| API Route | 1 | ax-bd-kg.ts |
| API Tests | 5 | service + route tests |
| Web Components | 4 | KgNodeSearch, KgNodeDetail, KgPathResult, KgImpactResult |
| Web Page | 1 | ontology.tsx |
| Web Tests | 4 | component tests |
| Web 수정 | 2 | api-client.ts, sidebar |
| **합계** | **24** | |
