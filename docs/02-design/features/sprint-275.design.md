---
id: FX-DESIGN-275
title: Sprint 275 Design — F518 Work Ontology 기반 연결
sprint: 275
f_items: [F518]
req: FX-REQ-546
status: done
created: 2026-04-13
---

# Sprint 275 Design — F518 Work Ontology 기반 연결

## §1 범위 확인

F518 구현 범위:
- D1 migration 0131: `work_kg_nodes` + `work_kg_edges` 신규 테이블
- `WorkKGService`: KG 빌드/탐색 서비스
- 공개 API 라우터 (`/api/work/public/*`) — auth 미들웨어 이전 등록
- 인증 라우터에 KG sync 엔드포인트 추가
- 공개 웹 라우트 2개 (`/roadmap`, `/changelog`)
- 라우터 `router.tsx` 업데이트

## §2 KG 스키마 설계

### 노드 타입 (10종)
```
IDEA | BACKLOG | REQ | F_ITEM | SPRINT | PHASE | PR | COMMIT | DEPLOY | CHANGELOG
```

### 엣지 타입 (5종)
| 타입 | 방향 | 의미 |
|------|------|------|
| `derives_from` | IDEA/BACKLOG → REQ | 아이디어가 요구사항으로 파생 |
| `implements` | F_ITEM → REQ | F-item이 REQ를 구현 |
| `belongs_to` | F_ITEM → SPRINT, SPRINT → PHASE, PR → SPRINT | 소속 관계 |
| `contains` | PR → COMMIT | PR이 Commit을 포함 |
| `deploys_to` | SPRINT → DEPLOY, DEPLOY → CHANGELOG | 배포→변경 이력 연결 |

### 노드 ID 형식
```
work:REQ:FX-REQ-546
work:FITEM:F518
work:SPRINT:275
work:PHASE:37
work:PR:539
work:COMMIT:<sha7>
work:DEPLOY:<datetime>
work:CHANGELOG:<phase-id>
work:BACKLOG:C48
work:IDEA:<uuid>
```

## §3 D1 Migration 0131

**파일**: `packages/api/src/db/migrations/0131_work_kg.sql`

```sql
-- F518: Work Lifecycle KG 테이블
CREATE TABLE IF NOT EXISTS work_kg_nodes (
  id TEXT PRIMARY KEY,
  node_type TEXT NOT NULL,          -- IDEA|BACKLOG|REQ|F_ITEM|SPRINT|PHASE|PR|COMMIT|DEPLOY|CHANGELOG
  label TEXT NOT NULL,              -- Human-readable (e.g. "F518", "FX-REQ-546")
  metadata TEXT NOT NULL DEFAULT '{}',  -- JSON: status, url, sprint, req_code, etc.
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wkg_nodes_type ON work_kg_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_wkg_nodes_label ON work_kg_nodes(label);

CREATE TABLE IF NOT EXISTS work_kg_edges (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES work_kg_nodes(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL REFERENCES work_kg_nodes(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL,          -- derives_from|implements|belongs_to|contains|deploys_to
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_wkg_edges_source ON work_kg_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_wkg_edges_target ON work_kg_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_wkg_edges_type ON work_kg_edges(edge_type);
```

## §4 WorkKGService 설계

**파일**: `packages/api/src/services/work-kg.service.ts`

```typescript
export interface KgNode {
  id: string;
  node_type: string;
  label: string;
  metadata: Record<string, unknown>;
}

export interface KgEdge {
  id: string;
  source_id: string;
  target_id: string;
  edge_type: string;
}

export interface KgGraph {
  nodes: KgNode[];
  edges: KgEdge[];
  root_id: string;
}

export interface KgSyncResult {
  nodes_upserted: number;
  edges_upserted: number;
  source: "spec" | "github" | "both";
}

export class WorkKGService {
  constructor(private env: Env) {}

  // SPEC.md 파싱 → KG 노드/엣지 upsert
  async syncFromSpec(specText: string): Promise<KgSyncResult>

  // GitHub API → PR/Commit 노드/엣지 upsert
  async syncFromGitHub(): Promise<KgSyncResult>

  // BFS 그래프 탐색 (depth 기본 2)
  async traceGraph(nodeId: string, depth?: number): Promise<KgGraph | null>

  // 내부: 노드 upsert 헬퍼
  private async upsertNode(node: Omit<KgNode, 'metadata'> & { metadata?: Record<string,unknown> }): Promise<void>

  // 내부: 엣지 upsert 헬퍼
  private async upsertEdge(edge: Omit<KgEdge, 'id'>): Promise<void>
}
```

### syncFromSpec 로직
1. SPEC.md `§5 F-item 목록` 파싱 (`TraceabilityService.parseFItemLinks()` 재활용)
2. REQ 코드, F-item, Sprint 번호, Phase 번호 추출
3. 각 항목을 `work_kg_nodes`에 upsert
4. 엣지: `F_ITEM → implements → REQ`, `F_ITEM → belongs_to → SPRINT`, `SPRINT → belongs_to → PHASE`

### syncFromGitHub 로직
1. `sprint_pr_links` 테이블 읽기 (F517에서 이미 GitHub API 동기화)
2. PR 행 → `work:PR:<number>` 노드 upsert
3. f_items JSON 파싱 → `PR → belongs_to → SPRINT` 엣지
4. commit_shas → `work:COMMIT:<sha7>` 노드 + `PR → contains → COMMIT` 엣지

### traceGraph BFS
```
입력: nodeId = "work:FITEM:F518", depth=2
1. 노드 ID로 root 조회
2. BFS: depth 번만큼 인접 노드 탐색 (양방향)
3. 방문한 노드+엣지 수집 → KgGraph 반환
```

## §5 API 라우트 설계

### 공개 라우터 (인증 불필요)

**파일**: `packages/api/src/routes/work-public.ts`

```
GET /api/work/public/roadmap     → WorkService.getPhaseProgress() 결과 반환
GET /api/work/public/changelog   → WorkService.getChangelog() 결과 반환
GET /api/work/public/kg/trace    → WorkKGService.traceGraph(id, depth) 반환
  query: { id: string, depth?: number (1-5, default 2) }
```

**app.ts 등록 위치**: `app.use("/api/*", authMiddleware)` **이전**

```typescript
// F518: Work KG public routes (인증 불필요)
import { workPublicRoute } from "./routes/work-public.js";
app.route("/api", workPublicRoute);
// ... (이후에 기존 auth middleware)
app.use("/api/*", authMiddleware);
```

### 인증 라우터 (기존 workRoute에 추가)

```
POST /api/work/kg/sync     → WorkKGService.syncFromSpec() + syncFromGitHub()
```

### 스키마 (Zod)

```typescript
const KgNodeSchema = z.object({
  id: z.string(),
  node_type: z.string(),
  label: z.string(),
  metadata: z.record(z.unknown()),
});

const KgEdgeSchema = z.object({
  id: z.string(),
  source_id: z.string(),
  target_id: z.string(),
  edge_type: z.string(),
});

const KgGraphSchema = z.object({
  root_id: z.string(),
  nodes: z.array(KgNodeSchema),
  edges: z.array(KgEdgeSchema),
});

const KgSyncOutputSchema = z.object({
  synced: z.object({
    nodes: z.number(),
    edges: z.number(),
  }),
});
```

## §6 공개 웹 라우트

### `/roadmap` — `packages/web/src/routes/roadmap.tsx`

- 기존 `RoadmapTab` 컴포넌트 로직을 독립 페이지로 재구현
- API: `GET /api/work/public/roadmap` (no auth header 필요)
- 전용 `fetchPublic<T>(path)` 헬퍼 (api-client.ts에 추가 또는 인라인 fetch)
- 레이아웃: 인증 없는 간단 컨테이너 (sidebar/nav 없음)

### `/changelog` — `packages/web/src/routes/changelog.tsx`

- 기존 `ChangelogTab` 로직 독립 페이지로 재구현
- API: `GET /api/work/public/changelog`
- 트레이서빌리티 강화: F-item 번호 감지 시 `/work-management?tab=trace&q=FNNN` 링크
- 공개 열람이므로 링크는 `/work-management`(인증 필요)가 아닌 `/roadmap` 내 앵커로 fallback

### router.tsx 추가 위치

```typescript
// F518: 공개 라우트 (ProtectedRoute 외부)
{ path: "roadmap", lazy: () => import("@/routes/roadmap") },
{ path: "changelog", lazy: () => import("@/routes/changelog") },
```

`login`, `invite`와 동일한 top-level 위치.

## §7 테스트 계획 (TDD Red Target)

### API 서비스 테스트 (`packages/api/src/services/__tests__/work-kg.service.test.ts`)

```typescript
// F518 TDD Red — WorkKGService

describe("WorkKGService", () => {
  describe("syncFromSpec", () => {
    it("SPEC.md에서 F-item 노드를 생성한다", async () => { ... });
    it("F-item → REQ implements 엣지를 생성한다", async () => { ... });
    it("F-item → Sprint belongs_to 엣지를 생성한다", async () => { ... });
    it("Sprint → Phase belongs_to 엣지를 생성한다", async () => { ... });
  });

  describe("syncFromGitHub", () => {
    it("sprint_pr_links → PR 노드를 생성한다", async () => { ... });
    it("PR → Sprint belongs_to 엣지를 생성한다", async () => { ... });
    it("commit_shas → Commit 노드를 생성한다", async () => { ... });
  });

  describe("traceGraph", () => {
    it("존재하는 노드에서 depth=1 BFS를 수행한다", async () => { ... });
    it("존재하지 않는 nodeId는 null을 반환한다", async () => { ... });
    it("depth=0이면 root 노드만 반환한다", async () => { ... });
    it("순환 참조가 있어도 무한 루프를 방지한다", async () => { ... });
  });
});
```

### E2E 테스트 (`packages/web/e2e/roadmap-changelog.spec.ts`)

```typescript
// F518 TDD Red — Public Roadmap/Changelog E2E

test("공개 Roadmap 페이지는 인증 없이 접근 가능하다", async ({ page }) => {
  await page.goto("/roadmap");
  await expect(page).not.toHaveURL(/login/);
  await expect(page.getByText("Phase")).toBeVisible();
});

test("공개 Changelog 페이지는 인증 없이 접근 가능하다", async ({ page }) => {
  await page.goto("/changelog");
  await expect(page).not.toHaveURL(/login/);
});

test("/api/work/public/kg/trace는 인증 없이 KG 결과를 반환한다", async ({ request }) => {
  const resp = await request.get("/api/work/public/kg/trace?id=work:FITEM:F518");
  expect(resp.status()).toBe(200);
  const data = await resp.json();
  expect(data).toHaveProperty("root_id");
  expect(data).toHaveProperty("nodes");
});
```

## §8 파일 매핑 (Worker 기준)

| # | 파일 | 액션 | 역할 |
|---|------|------|------|
| 1 | `packages/api/src/db/migrations/0131_work_kg.sql` | 신규 | work_kg 테이블 |
| 2 | `packages/api/src/services/work-kg.service.ts` | 신규 | KG 빌드/탐색 |
| 3 | `packages/api/src/services/__tests__/work-kg.service.test.ts` | 신규 | TDD Red |
| 4 | `packages/api/src/routes/work-public.ts` | 신규 | 공개 API 라우터 |
| 5 | `packages/api/src/routes/work.ts` | 수정 | KG sync 엔드포인트 추가 |
| 6 | `packages/api/src/app.ts` | 수정 | workPublicRoute 등록 (auth 이전) |
| 7 | `packages/web/src/routes/roadmap.tsx` | 신규 | 공개 Roadmap 페이지 |
| 8 | `packages/web/src/routes/changelog.tsx` | 신규 | 공개 Changelog 페이지 |
| 9 | `packages/web/src/router.tsx` | 수정 | 공개 라우트 2개 추가 |
| 10 | `packages/web/e2e/roadmap-changelog.spec.ts` | 신규 | E2E Red |

## §9 Gap Analysis 체크포인트

| 항목 | 검증 방법 |
|------|----------|
| work_kg_nodes/edges 테이블 존재 | migration 파일 확인 |
| syncFromSpec: F-item 노드 생성 | 단위 테스트 |
| syncFromGitHub: PR 노드 생성 | 단위 테스트 |
| traceGraph BFS 동작 | 단위 테스트 |
| /api/work/public/kg/trace 무인증 | E2E |
| /roadmap 공개 접근 | E2E |
| /changelog 공개 접근 | E2E |
| router.tsx 공개 라우트 2건 | 코드 확인 |
| workPublicRoute auth 이전 등록 | app.ts 순서 확인 |
