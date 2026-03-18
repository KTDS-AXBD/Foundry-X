import { describe, it, expect, vi } from "vitest";
import { WorktreeManager } from "../services/worktree-manager.js";

describe("WorktreeManager", () => {
  it("creates a worktree config with defaults", async () => {
    const manager = new WorktreeManager();
    const config = await manager.create("agent-1", "feat/planner");

    expect(config.agentId).toBe("agent-1");
    expect(config.branchName).toBe("feat/planner");
    expect(config.baseBranch).toBe("master");
    expect(config.status).toBe("active");
    expect(config.worktreePath).toBe("/tmp/foundry-x-worktrees/agent-1");
    expect(config.createdAt).toBeTruthy();
    expect(config.id).toMatch(/^wt-/);
  });

  it("creates a worktree config with custom baseBranch", async () => {
    const manager = new WorktreeManager({ basePath: "/custom/path" });
    const config = await manager.create("agent-2", "fix/bug", "develop");

    expect(config.baseBranch).toBe("develop");
    expect(config.worktreePath).toBe("/custom/path/agent-2");
  });

  it("cleans up an existing worktree and returns true", async () => {
    const manager = new WorktreeManager();
    await manager.create("agent-3", "feat/test");

    expect(await manager.cleanup("agent-3")).toBe(true);
    const list = manager.list();
    expect(list[0]!.status).toBe("cleaned");
    expect(list[0]!.cleanedAt).toBeTruthy();
  });

  it("returns false when cleaning up non-existent worktree", async () => {
    const manager = new WorktreeManager();
    expect(await manager.cleanup("no-such-agent")).toBe(false);
  });

  it("lists only active worktrees after mixed operations", async () => {
    const manager = new WorktreeManager();
    await manager.create("a1", "b1");
    await manager.create("a2", "b2");
    await manager.create("a3", "b3");
    await manager.cleanup("a2");

    const active = manager.list().filter((w: { status: string }) => w.status === "active");
    expect(active).toHaveLength(2);
  });

  it("cleanupAll returns count of cleaned active worktrees", async () => {
    const manager = new WorktreeManager();
    await manager.create("x1", "b1");
    await manager.create("x2", "b2");
    await manager.cleanup("x1");

    const count = await manager.cleanupAll();
    expect(count).toBe(1);
  });

  // ─── gitExecutor 통합 ───

  it("calls gitExecutor on create when provided", async () => {
    const gitExecutor = vi.fn().mockResolvedValue({ stdout: "", exitCode: 0 });
    const manager = new WorktreeManager({ gitExecutor });

    await manager.create("agent-git", "feat/test", "master");

    expect(gitExecutor).toHaveBeenCalledWith([
      "worktree", "add", "-b", "feat/test",
      "/tmp/foundry-x-worktrees/agent-git", "master",
    ]);
  });

  it("calls gitExecutor on cleanup when provided", async () => {
    const gitExecutor = vi.fn().mockResolvedValue({ stdout: "", exitCode: 0 });
    const manager = new WorktreeManager({ gitExecutor });

    await manager.create("agent-cleanup", "feat/clean");
    await manager.cleanup("agent-cleanup");

    expect(gitExecutor).toHaveBeenCalledWith([
      "worktree", "remove",
      "/tmp/foundry-x-worktrees/agent-cleanup", "--force",
    ]);
  });
});
