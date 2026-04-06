import { describe, it, expect, vi, beforeEach } from "vitest";
import { GitHubSyncService } from "../modules/portal/services/github-sync.js";
import { createMockD1 } from "./helpers/mock-d1.js";
import type { GitHubIssueEvent, GitHubPrEvent } from "../modules/portal/schemas/webhook.js";

// ─── Mock GitHubService ───

function createMockGitHub() {
  return {
    createIssue: vi.fn().mockResolvedValue({ number: 42, url: "https://github.com/test/issues/42" }),
    updateIssue: vi.fn().mockResolvedValue(undefined),
    addIssueComment: vi.fn().mockResolvedValue({ id: 1 }),
  } as any;
}

function makeIssueEvent(overrides: Partial<GitHubIssueEvent> = {}): GitHubIssueEvent {
  return {
    action: "closed",
    issue: { number: 42, title: "Test", state: "closed", body: null, labels: [] },
    repository: { full_name: "KTDS-AXBD/Foundry-X" },
    ...overrides,
  };
}

function makePrEvent(overrides: Partial<GitHubPrEvent> = {}): GitHubPrEvent {
  return {
    action: "closed",
    pull_request: { number: 10, title: "PR", state: "closed", merged: true, merged_at: "2026-03-19T00:00:00Z" },
    repository: { full_name: "KTDS-AXBD/Foundry-X" },
    ...overrides,
  };
}

describe("GitHubSyncService", () => {
  let db: ReturnType<typeof createMockD1>;
  let github: ReturnType<typeof createMockGitHub>;
  let sync: GitHubSyncService;

  beforeEach(async () => {
    db = createMockD1();
    github = createMockGitHub();
    // Add github sync columns (not in default mock schema)
    await db.exec("ALTER TABLE agent_tasks ADD COLUMN github_issue_number INTEGER DEFAULT NULL");
    await db.exec("ALTER TABLE agent_prs ADD COLUMN github_pr_number INTEGER DEFAULT NULL");
    // Add columns needed for Issue→Task auto-creation
    await db.exec("ALTER TABLE agent_tasks ADD COLUMN agent_id TEXT DEFAULT 'unassigned'");
    await db.exec("ALTER TABLE agent_tasks ADD COLUMN org_id TEXT DEFAULT ''");
    sync = new GitHubSyncService(github, db as any, "org_test");
  });

  // ─── syncTaskToIssue ───

  describe("syncTaskToIssue", () => {
    it("creates a GitHub issue and stores the number", async () => {
      await db.exec(
        "INSERT INTO agent_sessions (id, project_id, agent_name, started_at) VALUES ('sess-1', 'proj-1', 'worker', datetime('now'))"
      );
      await db.exec(
        "INSERT INTO agent_tasks (id, agent_session_id, branch, task_type, pr_status) VALUES ('task-1', 'sess-1', 'feat/f84', 'implement', 'pending')"
      );

      const result = await sync.syncTaskToIssue("task-1");

      expect(result.issueNumber).toBe(42);
      expect(github.createIssue).toHaveBeenCalledWith({
        title: "[implement] feat/f84",
        body: expect.stringContaining("task-1"),
        labels: ["foundry-x", "implement"],
      });

      // Verify DB was updated
      const row = await (db as any).prepare("SELECT github_issue_number FROM agent_tasks WHERE id = ?").bind("task-1").first();
      expect(row.github_issue_number).toBe(42);
    });

    it("updates existing issue if already synced", async () => {
      await db.exec(
        "INSERT INTO agent_sessions (id, project_id, agent_name, started_at) VALUES ('sess-2', 'proj-1', 'worker', datetime('now'))"
      );
      await db.exec(
        "INSERT INTO agent_tasks (id, agent_session_id, branch, task_type, pr_status, github_issue_number) VALUES ('task-2', 'sess-2', 'feat/f84', 'implement', 'completed', 42)"
      );

      const result = await sync.syncTaskToIssue("task-2");

      expect(result.issueNumber).toBe(42);
      expect(github.createIssue).not.toHaveBeenCalled();
      expect(github.updateIssue).toHaveBeenCalledWith(42, { state: "closed" });
    });

    it("throws for non-existent task", async () => {
      await expect(sync.syncTaskToIssue("nonexistent")).rejects.toThrow("Task not found");
    });

    it("uses branch as title when task_type is null", async () => {
      await db.exec(
        "INSERT INTO agent_sessions (id, project_id, agent_name, started_at) VALUES ('sess-3', 'proj-1', 'worker', datetime('now'))"
      );
      await db.exec(
        "INSERT INTO agent_tasks (id, agent_session_id, branch, pr_status) VALUES ('task-3', 'sess-3', 'fix/bug-123', 'pending')"
      );

      await sync.syncTaskToIssue("task-3");

      expect(github.createIssue).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Task: fix/bug-123" }),
      );
    });
  });

  // ─── syncIssueToTask ───

  describe("syncIssueToTask", () => {
    beforeEach(async () => {
      await db.exec(
        "INSERT INTO agent_sessions (id, project_id, agent_name, started_at) VALUES ('sess-10', 'proj-1', 'worker', datetime('now'))"
      );
      await db.exec(
        "INSERT INTO agent_tasks (id, agent_session_id, branch, pr_status, github_issue_number) VALUES ('task-10', 'sess-10', 'feat/f84', 'pending', 42)"
      );
    });

    it("updates task status when issue is closed", async () => {
      const event = makeIssueEvent({ action: "closed", issue: { number: 42, title: "T", state: "closed", body: null, labels: [] } });
      const result = await sync.syncIssueToTask(event);

      expect(result.taskId).toBe("task-10");
      expect(result.action).toBe("updated:completed");

      const row = await (db as any).prepare("SELECT pr_status FROM agent_tasks WHERE id = ?").bind("task-10").first();
      expect(row.pr_status).toBe("completed");
    });

    it("updates task status when issue is reopened", async () => {
      // First close it
      await db.exec("UPDATE agent_tasks SET pr_status = 'completed' WHERE id = 'task-10'");

      const event = makeIssueEvent({ action: "reopened", issue: { number: 42, title: "T", state: "open", body: null, labels: [] } });
      const result = await sync.syncIssueToTask(event);

      expect(result.taskId).toBe("task-10");
      expect(result.action).toBe("updated:pending");
    });

    it("returns no_matching_task for unknown issue number", async () => {
      const event = makeIssueEvent({ issue: { number: 999, title: "T", state: "closed", body: null, labels: [] } });
      const result = await sync.syncIssueToTask(event);

      expect(result.taskId).toBeNull();
      expect(result.action).toBe("no_matching_task");
    });

    it("returns already_synced if task is already in target state", async () => {
      const event = makeIssueEvent({ action: "opened", issue: { number: 42, title: "T", state: "open", body: null, labels: [] } });
      const result = await sync.syncIssueToTask(event);

      expect(result.taskId).toBe("task-10");
      expect(result.action).toBe("already_synced");
    });

    it("ignores unsupported actions like labeled", async () => {
      const event = makeIssueEvent({ action: "labeled" });
      const result = await sync.syncIssueToTask(event);

      expect(result.taskId).toBeNull();
      expect(result.action).toBe("ignored:labeled");
    });
  });

  // ─── syncPrStatus ───

  describe("syncPrStatus", () => {
    beforeEach(async () => {
      await db.exec(
        "INSERT INTO agent_prs (id, agent_id, repo, branch, pr_number, status) VALUES ('pr-1', 'agent-1', 'KTDS-AXBD/Foundry-X', 'feat/f84', 10, 'open')"
      );
    });

    it("updates PR to merged when closed with merge", async () => {
      const event = makePrEvent({
        action: "closed",
        pull_request: { number: 10, title: "PR", state: "closed", merged: true, merged_at: "2026-03-19T12:00:00Z" },
      });
      const result = await sync.syncPrStatus(event);

      expect(result.prRecordId).toBe("pr-1");
      expect(result.action).toBe("updated:merged");

      const row = await (db as any).prepare("SELECT status, merged_at FROM agent_prs WHERE id = ?").bind("pr-1").first();
      expect(row.status).toBe("merged");
      expect(row.merged_at).toBe("2026-03-19T12:00:00Z");
    });

    it("updates PR to closed when closed without merge", async () => {
      const event = makePrEvent({
        action: "closed",
        pull_request: { number: 10, title: "PR", state: "closed", merged: false, merged_at: null },
      });
      const result = await sync.syncPrStatus(event);

      expect(result.prRecordId).toBe("pr-1");
      expect(result.action).toBe("updated:closed");
    });

    it("returns no_matching_pr for unknown PR number", async () => {
      const event = makePrEvent({
        pull_request: { number: 999, title: "PR", state: "closed", merged: true, merged_at: null },
      });
      const result = await sync.syncPrStatus(event);

      expect(result.prRecordId).toBeNull();
      expect(result.action).toBe("no_matching_pr");
    });

    it("updates PR to open on reopened event", async () => {
      await db.exec("UPDATE agent_prs SET status = 'closed' WHERE id = 'pr-1'");

      const event = makePrEvent({
        action: "reopened",
        pull_request: { number: 10, title: "PR", state: "open", merged: false, merged_at: null },
      });
      const result = await sync.syncPrStatus(event);

      expect(result.prRecordId).toBe("pr-1");
      expect(result.action).toBe("updated:open");
    });

    it("ignores synchronize action", async () => {
      const event = makePrEvent({ action: "synchronize" });
      const result = await sync.syncPrStatus(event);

      expect(result.prRecordId).toBeNull();
      expect(result.action).toBe("ignored:synchronize");
    });
  });

  // ─── Schema validation ───

  describe("schema validation", () => {
    it("githubIssueEventSchema validates correct payload", async () => {
      const { githubIssueEventSchema } = await import("../modules/portal/schemas/webhook.js");
      const result = githubIssueEventSchema.safeParse({
        action: "opened",
        issue: { number: 1, title: "Test", state: "open", body: "desc", labels: [{ name: "bug" }] },
        repository: { full_name: "owner/repo" },
      });
      expect(result.success).toBe(true);
    });

    it("githubPrEventSchema validates correct payload", async () => {
      const { githubPrEventSchema } = await import("../modules/portal/schemas/webhook.js");
      const result = githubPrEventSchema.safeParse({
        action: "closed",
        pull_request: { number: 5, title: "PR", state: "closed", merged: true, merged_at: "2026-01-01" },
        repository: { full_name: "owner/repo" },
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid issue event action", async () => {
      const { githubIssueEventSchema } = await import("../modules/portal/schemas/webhook.js");
      const result = githubIssueEventSchema.safeParse({
        action: "invalid_action",
        issue: { number: 1, title: "T", state: "open", body: null, labels: [] },
        repository: { full_name: "owner/repo" },
      });
      expect(result.success).toBe(false);
    });
  });

  // ─── Sprint 21: Issue→Task auto-creation (F93) ───

  describe("Issue→Task auto-creation", () => {
    it("auto-creates task when Issue opened with foundry-x label", async () => {
      const event = makeIssueEvent({
        action: "opened",
        issue: {
          number: 100,
          title: "New feature request",
          state: "open",
          body: "Please implement this",
          labels: [{ name: "foundry-x" }, { name: "enhancement" }],
        },
      });
      const result = await sync.syncIssueToTask(event);

      expect(result.action).toBe("auto_created");
      expect(result.taskId).toMatch(/^task-gh-100-/);

      // Verify DB record
      const row = await (db as any)
        .prepare("SELECT * FROM agent_tasks WHERE id = ?")
        .bind(result.taskId)
        .first();
      expect(row).not.toBeNull();
      expect(row.task_type).toBe("feature");
      expect(row.branch).toBe("github-issue-100");
      expect(row.pr_status).toBe("pending");
      expect(row.github_issue_number).toBe(100);
      expect(row.org_id).toBe("org_test");
    });

    it("skips without foundry-x label", async () => {
      const event = makeIssueEvent({
        action: "opened",
        issue: {
          number: 101,
          title: "Random issue",
          state: "open",
          body: "No foundry label",
          labels: [{ name: "bug" }],
        },
      });
      const result = await sync.syncIssueToTask(event);

      expect(result.taskId).toBeNull();
      expect(result.action).toBe("skipped:no_foundry_label");
    });

    it("skips for non-opened actions (closed, reopened without matching task)", async () => {
      const event = makeIssueEvent({
        action: "closed",
        issue: {
          number: 102,
          title: "Closed issue",
          state: "closed",
          body: null,
          labels: [{ name: "foundry-x" }],
        },
      });
      const result = await sync.syncIssueToTask(event);

      expect(result.taskId).toBeNull();
      expect(result.action).toBe("no_matching_task");
    });

    it("extracts task_type from labels (bug → bug-fix)", async () => {
      const event = makeIssueEvent({
        action: "opened",
        issue: {
          number: 103,
          title: "Bug report",
          state: "open",
          body: "Something broken",
          labels: [{ name: "foundry-x" }, { name: "bug" }],
        },
      });
      const result = await sync.syncIssueToTask(event);

      const row = await (db as any)
        .prepare("SELECT task_type FROM agent_tasks WHERE id = ?")
        .bind(result.taskId)
        .first();
      expect(row.task_type).toBe("bug-fix");
    });

    it("extracts task_type (enhancement → feature)", async () => {
      const event = makeIssueEvent({
        action: "opened",
        issue: {
          number: 104,
          title: "Enhancement",
          state: "open",
          body: "Improve this",
          labels: [{ name: "foundry-x" }, { name: "enhancement" }],
        },
      });
      const result = await sync.syncIssueToTask(event);

      const row = await (db as any)
        .prepare("SELECT task_type FROM agent_tasks WHERE id = ?")
        .bind(result.taskId)
        .first();
      expect(row.task_type).toBe("feature");
    });

    it("defaults task_type to 'task'", async () => {
      const event = makeIssueEvent({
        action: "opened",
        issue: {
          number: 105,
          title: "Generic issue",
          state: "open",
          body: "Something",
          labels: [{ name: "foundry-x" }],
        },
      });
      const result = await sync.syncIssueToTask(event);

      const row = await (db as any)
        .prepare("SELECT task_type FROM agent_tasks WHERE id = ?")
        .bind(result.taskId)
        .first();
      expect(row.task_type).toBe("task");
    });

    it("extracts agent from labels (agent:reviewer → reviewer-agent)", async () => {
      const event = makeIssueEvent({
        action: "opened",
        issue: {
          number: 106,
          title: "Review task",
          state: "open",
          body: "Need review",
          labels: [{ name: "foundry-x" }, { name: "agent:reviewer" }],
        },
      });
      const result = await sync.syncIssueToTask(event);

      const row = await (db as any)
        .prepare("SELECT agent_id FROM agent_tasks WHERE id = ?")
        .bind(result.taskId)
        .first();
      expect(row.agent_id).toBe("reviewer-agent");
    });

    it("truncates Issue body to 1000 chars", async () => {
      const longBody = "x".repeat(2000);
      const event = makeIssueEvent({
        action: "opened",
        issue: {
          number: 107,
          title: "Long body",
          state: "open",
          body: longBody,
          labels: [{ name: "foundry-x" }],
        },
      });
      const result = await sync.syncIssueToTask(event);

      const row = await (db as any)
        .prepare("SELECT result FROM agent_tasks WHERE id = ?")
        .bind(result.taskId)
        .first();
      expect(row.result.length).toBe(1000);
    });
  });
});
