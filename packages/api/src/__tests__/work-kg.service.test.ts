// F518: Work Lifecycle KG — TDD Red Phase
import { describe, it, expect, beforeEach } from "vitest";
import { WorkKGService } from "../services/work-kg.service.js";
import { createTestEnv } from "./helpers/test-app.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SPEC_FIXTURE = `
## §5 Feature Roadmap

| F516 | Backlog 인입 파이프라인 (FX-REQ-544, P0) | Sprint 273 | ✅ | PR #538 |
| F517 | 메타데이터 트레이서빌리티 (FX-REQ-545, P0) | Sprint 274 | ✅ | PR #539 |
| F518 | Work Ontology 기반 연결 (FX-REQ-546, P0) | Sprint 275 | 🔧(design) | C48 승격 |
`;

// ─── syncFromSpec ─────────────────────────────────────────────────────────────

describe("WorkKGService F518", () => {
  let svc: WorkKGService;
  let env: ReturnType<typeof createTestEnv>;

  beforeEach(() => {
    env = createTestEnv();
    svc = new WorkKGService(env as any);
  });

  describe("syncFromSpec", () => {
    it("F-item 노드를 work_kg_nodes에 upsert한다", async () => {
      await svc.syncFromSpec(SPEC_FIXTURE);
      const row = await env.DB.prepare(
        "SELECT id, node_type, label FROM work_kg_nodes WHERE id = ?"
      ).bind("work:FITEM:F518").first<{ id: string; node_type: string; label: string }>();
      expect(row).not.toBeNull();
      expect(row!.node_type).toBe("F_ITEM");
      expect(row!.label).toBe("F518");
    });

    it("REQ 노드를 work_kg_nodes에 upsert한다", async () => {
      await svc.syncFromSpec(SPEC_FIXTURE);
      const row = await env.DB.prepare(
        "SELECT id, node_type FROM work_kg_nodes WHERE id = ?"
      ).bind("work:REQ:FX-REQ-546").first<{ id: string; node_type: string }>();
      expect(row).not.toBeNull();
      expect(row!.node_type).toBe("REQ");
    });

    it("Sprint 노드를 work_kg_nodes에 upsert한다", async () => {
      await svc.syncFromSpec(SPEC_FIXTURE);
      const row = await env.DB.prepare(
        "SELECT id, node_type FROM work_kg_nodes WHERE id = ?"
      ).bind("work:SPRINT:275").first<{ id: string; node_type: string }>();
      expect(row).not.toBeNull();
      expect(row!.node_type).toBe("SPRINT");
    });

    it("F-item → REQ: implements 엣지를 생성한다", async () => {
      await svc.syncFromSpec(SPEC_FIXTURE);
      const edge = await env.DB.prepare(
        "SELECT edge_type FROM work_kg_edges WHERE source_id = ? AND target_id = ?"
      ).bind("work:FITEM:F518", "work:REQ:FX-REQ-546").first<{ edge_type: string }>();
      expect(edge).not.toBeNull();
      expect(edge!.edge_type).toBe("implements");
    });

    it("F-item → Sprint: belongs_to 엣지를 생성한다", async () => {
      await svc.syncFromSpec(SPEC_FIXTURE);
      const edge = await env.DB.prepare(
        "SELECT edge_type FROM work_kg_edges WHERE source_id = ? AND target_id = ?"
      ).bind("work:FITEM:F518", "work:SPRINT:275").first<{ edge_type: string }>();
      expect(edge).not.toBeNull();
      expect(edge!.edge_type).toBe("belongs_to");
    });

    it("3개 F-item에서 nodes_upserted >= 9를 반환한다", async () => {
      const result = await svc.syncFromSpec(SPEC_FIXTURE);
      // 3 F_ITEM + 3 REQ + 3 SPRINT nodes = 9
      expect(result.nodes_upserted).toBeGreaterThanOrEqual(9);
    });

    it("edges_upserted >= 6를 반환한다", async () => {
      const result = await svc.syncFromSpec(SPEC_FIXTURE);
      // 3 implements + 3 belongs_to = 6
      expect(result.edges_upserted).toBeGreaterThanOrEqual(6);
    });

    it("REQ 없는 F-item은 REQ 노드/엣지를 생성하지 않는다", async () => {
      const specNoReq = `
| F999 | REQ 없는 항목 | Sprint 280 | 📋 | |
`;
      await svc.syncFromSpec(specNoReq);
      const reqNode = await env.DB.prepare(
        "SELECT id FROM work_kg_nodes WHERE node_type = 'REQ' AND label LIKE '%F999%'"
      ).first();
      expect(reqNode).toBeNull();
    });
  });

  // ─── syncFromGitHub ───────────────────────────────────────────────────────

  describe("syncFromGitHub", () => {
    beforeEach(async () => {
      // seed sprint_pr_links (F517에서 채워짐)
      await env.DB.prepare(
        "INSERT INTO sprint_pr_links (id, sprint_num, pr_number, f_items, pr_title, pr_url, pr_state, commit_shas) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        "sprint-275-pr-540", "275", 540,
        JSON.stringify(["F518"]),
        "feat: Sprint 275 — F518",
        "https://github.com/KTDS-AXBD/Foundry-X/pull/540",
        "open",
        JSON.stringify(["abc1234", "def5678"])
      ).run();
    });

    it("sprint_pr_links → PR 노드를 work_kg_nodes에 upsert한다", async () => {
      await svc.syncFromGitHub();
      const row = await env.DB.prepare(
        "SELECT id, node_type FROM work_kg_nodes WHERE id = ?"
      ).bind("work:PR:540").first<{ id: string; node_type: string }>();
      expect(row).not.toBeNull();
      expect(row!.node_type).toBe("PR");
    });

    it("PR → Sprint: belongs_to 엣지를 생성한다", async () => {
      await svc.syncFromGitHub();
      const edge = await env.DB.prepare(
        "SELECT edge_type FROM work_kg_edges WHERE source_id = ? AND target_id = ?"
      ).bind("work:PR:540", "work:SPRINT:275").first<{ edge_type: string }>();
      expect(edge).not.toBeNull();
      expect(edge!.edge_type).toBe("belongs_to");
    });

    it("commit_shas → Commit 노드를 생성한다", async () => {
      await svc.syncFromGitHub();
      const row = await env.DB.prepare(
        "SELECT id, node_type FROM work_kg_nodes WHERE id = ?"
      ).bind("work:COMMIT:abc1234").first<{ id: string; node_type: string }>();
      expect(row).not.toBeNull();
      expect(row!.node_type).toBe("COMMIT");
    });

    it("PR → Commit: contains 엣지를 생성한다", async () => {
      await svc.syncFromGitHub();
      const edge = await env.DB.prepare(
        "SELECT edge_type FROM work_kg_edges WHERE source_id = ? AND target_id = ?"
      ).bind("work:PR:540", "work:COMMIT:abc1234").first<{ edge_type: string }>();
      expect(edge).not.toBeNull();
      expect(edge!.edge_type).toBe("contains");
    });

    it("nodes_upserted > 0을 반환한다", async () => {
      const result = await svc.syncFromGitHub();
      expect(result.nodes_upserted).toBeGreaterThan(0);
    });
  });

  // ─── traceGraph ───────────────────────────────────────────────────────────

  describe("traceGraph", () => {
    beforeEach(async () => {
      // seed 최소 KG: F518 → FX-REQ-546, F518 → Sprint 275
      await env.DB.prepare(
        "INSERT INTO work_kg_nodes (id, node_type, label) VALUES (?, ?, ?)"
      ).bind("work:FITEM:F518", "F_ITEM", "F518").run();
      await env.DB.prepare(
        "INSERT INTO work_kg_nodes (id, node_type, label) VALUES (?, ?, ?)"
      ).bind("work:REQ:FX-REQ-546", "REQ", "FX-REQ-546").run();
      await env.DB.prepare(
        "INSERT INTO work_kg_nodes (id, node_type, label) VALUES (?, ?, ?)"
      ).bind("work:SPRINT:275", "SPRINT", "275").run();
      await env.DB.prepare(
        "INSERT INTO work_kg_edges (id, source_id, target_id, edge_type) VALUES (?, ?, ?, ?)"
      ).bind("e1", "work:FITEM:F518", "work:REQ:FX-REQ-546", "implements").run();
      await env.DB.prepare(
        "INSERT INTO work_kg_edges (id, source_id, target_id, edge_type) VALUES (?, ?, ?, ?)"
      ).bind("e2", "work:FITEM:F518", "work:SPRINT:275", "belongs_to").run();
    });

    it("존재하는 노드에서 BFS를 수행하여 KgGraph를 반환한다", async () => {
      const graph = await svc.traceGraph("work:FITEM:F518", 1);
      expect(graph).not.toBeNull();
      expect(graph!.root_id).toBe("work:FITEM:F518");
      expect(graph!.nodes.length).toBeGreaterThanOrEqual(1);
    });

    it("depth=1이면 직접 인접 노드까지 포함한다", async () => {
      const graph = await svc.traceGraph("work:FITEM:F518", 1);
      const ids = graph!.nodes.map(n => n.id);
      expect(ids).toContain("work:FITEM:F518");
      expect(ids).toContain("work:REQ:FX-REQ-546");
      expect(ids).toContain("work:SPRINT:275");
    });

    it("depth=0이면 root 노드만 반환한다", async () => {
      const graph = await svc.traceGraph("work:FITEM:F518", 0);
      expect(graph).not.toBeNull();
      expect(graph!.nodes).toHaveLength(1);
      expect(graph!.nodes[0]!.id).toBe("work:FITEM:F518");
      expect(graph!.edges).toHaveLength(0);
    });

    it("존재하지 않는 nodeId는 null을 반환한다", async () => {
      const graph = await svc.traceGraph("work:FITEM:F999", 1);
      expect(graph).toBeNull();
    });

    it("엣지 목록에 source→target 관계가 포함된다", async () => {
      const graph = await svc.traceGraph("work:FITEM:F518", 1);
      const edgeTypes = graph!.edges.map(e => e.edge_type);
      expect(edgeTypes).toContain("implements");
      expect(edgeTypes).toContain("belongs_to");
    });
  });
});
