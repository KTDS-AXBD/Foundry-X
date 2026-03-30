/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "./helpers/mock-d1.js";
import { ShardDocService } from "../services/shard-doc.js";

const SHARDS_DDL = `
  CREATE TABLE IF NOT EXISTS document_shards (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    document_title TEXT NOT NULL DEFAULT '',
    section_index INTEGER NOT NULL,
    heading TEXT NOT NULL,
    content TEXT NOT NULL,
    keywords TEXT NOT NULL DEFAULT '[]',
    agent_roles TEXT NOT NULL DEFAULT '[]',
    token_count INTEGER NOT NULL DEFAULT 0,
    org_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_shards_doc ON document_shards(document_id);
  CREATE INDEX IF NOT EXISTS idx_shards_org ON document_shards(org_id);
`;

describe("ShardDocService", () => {
  let db: D1Database;
  let svc: ShardDocService;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(SHARDS_DDL);
    db = mockDb as unknown as D1Database;
    svc = new ShardDocService(db);
  });

  describe("parseMarkdownSections", () => {
    it("splits on ## headings", () => {
      const md = `# Title

Preamble text.

## Section One

Content one.

## Section Two

Content two.`;

      const sections = svc.parseMarkdownSections(md);
      expect(sections).toHaveLength(3);
      expect(sections[0]!.heading).toBe("_preamble");
      expect(sections[0]!.content).toContain("Preamble text.");
      expect(sections[1]!.heading).toBe("Section One");
      expect(sections[1]!.content).toContain("Content one.");
      expect(sections[2]!.heading).toBe("Section Two");
    });

    it("handles document with no headings", () => {
      const md = "Just some text without headings.";
      const sections = svc.parseMarkdownSections(md);
      expect(sections).toHaveLength(1);
      expect(sections[0]!.heading).toBe("_preamble");
    });

    it("ignores ## inside code blocks", () => {
      const md = `## Real Section

Some text.

\`\`\`markdown
## Not a real heading
\`\`\`

More text.

## Next Section

Next content.`;

      const sections = svc.parseMarkdownSections(md);
      expect(sections).toHaveLength(2);
      expect(sections[0]!.heading).toBe("Real Section");
      expect(sections[0]!.content).toContain("## Not a real heading");
      expect(sections[1]!.heading).toBe("Next Section");
    });

    it("handles empty document", () => {
      const sections = svc.parseMarkdownSections("");
      expect(sections).toHaveLength(0);
    });

    it("preserves section order via index", () => {
      const md = `## First\nA\n## Second\nB\n## Third\nC`;
      const sections = svc.parseMarkdownSections(md);
      expect(sections.map((s) => s.index)).toEqual([0, 1, 2]);
    });
  });

  describe("extractKeywords", () => {
    it("extracts known keywords from content", () => {
      const keywords = svc.extractKeywords({
        heading: "Security Review",
        content: "Check for OWASP vulnerability scanning and XSS injection.",
        index: 0,
      });
      expect(keywords).toContain("security");
      expect(keywords).toContain("owasp");
      expect(keywords).toContain("vulnerability");
      expect(keywords).toContain("injection");
    });

    it("returns empty for unrelated content", () => {
      const keywords = svc.extractKeywords({
        heading: "Random",
        content: "Nothing relevant here.",
        index: 0,
      });
      expect(keywords).toEqual([]);
    });

    it("matches keywords case-insensitively", () => {
      const keywords = svc.extractKeywords({
        heading: "Code Review Process",
        content: "Use ESLint and Prettier for linting.",
        index: 0,
      });
      expect(keywords).toContain("review");
      expect(keywords).toContain("lint");
      expect(keywords).toContain("eslint");
      expect(keywords).toContain("prettier");
    });
  });

  describe("matchAgentRoles", () => {
    it("maps security keywords to security role", () => {
      const roles = svc.matchAgentRoles(["owasp", "vulnerability"]);
      expect(roles).toContain("security");
    });

    it("maps test keywords to test role", () => {
      const roles = svc.matchAgentRoles(["test", "coverage"]);
      expect(roles).toContain("test");
    });

    it("maps multiple keyword groups to multiple roles", () => {
      const roles = svc.matchAgentRoles(["review", "test", "deploy"]);
      expect(roles).toContain("reviewer");
      expect(roles).toContain("test");
      expect(roles).toContain("infra");
    });

    it("returns empty for no matches", () => {
      const roles = svc.matchAgentRoles(["unrelated"]);
      expect(roles).toEqual([]);
    });
  });

  describe("shardDocument", () => {
    it("creates shards from markdown document", async () => {
      const md = `# PRD v8

## Architecture

Design patterns and component architecture.

## Security

OWASP Top 10 vulnerability scanning.

## Testing

Unit test coverage and integration test setup.`;

      const shards = await svc.shardDocument({
        documentId: "prd-v8",
        title: "PRD v8 Final",
        content: md,
        orgId: "org-1",
      });

      expect(shards.length).toBeGreaterThanOrEqual(3);

      const archShard = shards.find((s) => s.heading === "Architecture");
      expect(archShard).toBeDefined();
      expect(archShard!.agentRoles).toContain("architect");

      const secShard = shards.find((s) => s.heading === "Security");
      expect(secShard).toBeDefined();
      expect(secShard!.agentRoles).toContain("security");

      const testShard = shards.find((s) => s.heading === "Testing");
      expect(testShard).toBeDefined();
      expect(testShard!.agentRoles).toContain("test");
    });

    it("sets tokenCount > 0 for non-empty sections", async () => {
      const shards = await svc.shardDocument({
        documentId: "doc-1",
        content: "## Section\n\nSome content with multiple words here.",
      });

      expect(shards[0]!.tokenCount).toBeGreaterThan(0);
    });

    it("re-sharding deletes old shards first", async () => {
      const md = "## First\n\nContent.";
      await svc.shardDocument({ documentId: "doc-1", content: md });
      const shards1 = await svc.listShards("doc-1");

      const md2 = "## New First\n\nNew content.\n\n## New Second\n\nMore.";
      await svc.shardDocument({ documentId: "doc-1", content: md2 });
      const shards2 = await svc.listShards("doc-1");

      expect(shards2.length).toBe(2);
      // Old shard should be gone
      expect(shards2.find((s) => s.heading === "First")).toBeUndefined();
    });
  });

  describe("getShardsForAgent", () => {
    it("returns shards matching agent role", async () => {
      const md = `## Code Review

Run lint and review PR changes.

## Deployment

Deploy to cloudflare workers infrastructure.

## Testing

Run vitest unit test suite.`;

      await svc.shardDocument({ documentId: "doc-2", content: md });

      const reviewShards = await svc.getShardsForAgent("reviewer");
      expect(reviewShards.length).toBeGreaterThanOrEqual(1);
      expect(reviewShards[0]!.heading).toBe("Code Review");

      const infraShards = await svc.getShardsForAgent("infra");
      expect(infraShards.length).toBeGreaterThanOrEqual(1);
      expect(infraShards[0]!.heading).toBe("Deployment");
    });

    it("filters by documentId when provided", async () => {
      await svc.shardDocument({ documentId: "doc-a", content: "## Testing\n\nTest content." });
      await svc.shardDocument({ documentId: "doc-b", content: "## Testing\n\nMore test content." });

      const filtered = await svc.getShardsForAgent("test", "doc-a");
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.documentId).toBe("doc-a");
    });
  });

  describe("listShards", () => {
    it("returns shards ordered by section_index", async () => {
      const md = "## A\n\nFirst.\n\n## B\n\nSecond.\n\n## C\n\nThird.";
      await svc.shardDocument({ documentId: "doc-3", content: md });

      const shards = await svc.listShards("doc-3");
      expect(shards.map((s) => s.heading)).toEqual(["A", "B", "C"]);
      expect(shards.map((s) => s.sectionIndex)).toEqual([0, 1, 2]);
    });

    it("respects limit and offset", async () => {
      const md = "## A\n\nA.\n\n## B\n\nB.\n\n## C\n\nC.";
      await svc.shardDocument({ documentId: "doc-4", content: md });

      const page = await svc.listShards("doc-4", 1, 1);
      expect(page).toHaveLength(1);
      expect(page[0]!.heading).toBe("B");
    });
  });

  describe("deleteShards", () => {
    it("removes all shards for a document", async () => {
      await svc.shardDocument({ documentId: "doc-5", content: "## X\n\nContent." });
      let shards = await svc.listShards("doc-5");
      expect(shards.length).toBeGreaterThan(0);

      await svc.deleteShards("doc-5");
      shards = await svc.listShards("doc-5");
      expect(shards).toHaveLength(0);
    });

    it("does not affect other documents", async () => {
      await svc.shardDocument({ documentId: "keep", content: "## Keep\n\nKeep me." });
      await svc.shardDocument({ documentId: "delete", content: "## Delete\n\nDelete me." });

      await svc.deleteShards("delete");

      const kept = await svc.listShards("keep");
      expect(kept).toHaveLength(1);
    });
  });
});
