export interface WorktreeConfig {
  id: string;
  agentId: string;
  branchName: string;
  worktreePath: string;
  baseBranch: string;
  status: "active" | "completed" | "failed" | "cleaned";
  createdAt: string;
  cleanedAt?: string;
}

interface GitExecutor {
  (args: string[]): Promise<{ stdout: string; exitCode: number }>;
}

interface WorktreeManagerDeps {
  db?: D1Database;
  gitExecutor?: GitExecutor;
  basePath?: string;
}

export class WorktreeManager {
  private worktrees = new Map<string, WorktreeConfig>();
  private basePath: string;
  private db?: D1Database;
  private gitExecutor?: GitExecutor;

  constructor(deps: WorktreeManagerDeps = {}) {
    this.basePath = deps.basePath ?? "/tmp/foundry-x-worktrees";
    this.db = deps.db;
    this.gitExecutor = deps.gitExecutor;
  }

  async create(
    agentId: string,
    branchName: string,
    baseBranch = "master",
  ): Promise<WorktreeConfig> {
    const worktreePath = `${this.basePath}/${agentId}`;
    const id = `wt-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    if (this.gitExecutor) {
      await this.gitExecutor([
        "worktree", "add", "-b", branchName, worktreePath, baseBranch,
      ]);
    }

    const config: WorktreeConfig = {
      id, agentId, branchName, worktreePath, baseBranch,
      status: "active", createdAt: now,
    };
    this.worktrees.set(agentId, config);

    if (this.db) {
      await this.db
        .prepare(
          `INSERT INTO agent_worktrees
           (id, agent_id, branch_name, worktree_path, base_branch, status, created_at)
           VALUES (?, ?, ?, ?, ?, 'active', ?)`,
        )
        .bind(id, agentId, branchName, worktreePath, baseBranch, now)
        .run();
    }

    return config;
  }

  async cleanup(agentId: string): Promise<boolean> {
    const config = this.worktrees.get(agentId);
    if (!config) return false;

    if (this.gitExecutor) {
      try {
        await this.gitExecutor([
          "worktree", "remove", config.worktreePath, "--force",
        ]);
      } catch {
        // in-memory fallback
      }
    }

    config.status = "cleaned";
    config.cleanedAt = new Date().toISOString();

    if (this.db) {
      await this.db
        .prepare(
          `UPDATE agent_worktrees SET status = 'cleaned', cleaned_at = ?
           WHERE agent_id = ? AND status = 'active'`,
        )
        .bind(config.cleanedAt, agentId)
        .run();
    }

    return true;
  }

  list(): WorktreeConfig[] {
    return Array.from(this.worktrees.values());
  }

  getPath(agentId: string): string | null {
    return this.worktrees.get(agentId)?.worktreePath ?? null;
  }

  // ─── F102: Git rebase helpers ───

  async fetchBase(agentId: string, remote = "origin"): Promise<void> {
    if (!this.gitExecutor) return;
    const config = this.worktrees.get(agentId);
    if (!config) throw new Error(`Worktree not found: ${agentId}`);
    await this.gitExecutor(["fetch", remote, config.baseBranch]);
  }

  async rebase(agentId: string, onto: string): Promise<{ stdout: string; exitCode: number }> {
    if (!this.gitExecutor) return { stdout: "", exitCode: 0 };
    return this.gitExecutor(["rebase", `origin/${onto}`]);
  }

  async abortRebase(agentId: string): Promise<void> {
    if (!this.gitExecutor) return;
    try {
      await this.gitExecutor(["rebase", "--abort"]);
    } catch {
      // Already not in rebase state
    }
  }

  async continueRebase(agentId: string): Promise<{ stdout: string; exitCode: number }> {
    if (!this.gitExecutor) return { stdout: "", exitCode: 0 };
    return this.gitExecutor(["rebase", "--continue"]);
  }

  async stageFile(agentId: string, filePath: string): Promise<void> {
    if (!this.gitExecutor) return;
    await this.gitExecutor(["add", filePath]);
  }

  async cleanupAll(): Promise<number> {
    let count = 0;
    for (const [agentId, config] of this.worktrees) {
      if (config.status === "active") {
        await this.cleanup(agentId);
        count++;
      }
    }
    return count;
  }
}
