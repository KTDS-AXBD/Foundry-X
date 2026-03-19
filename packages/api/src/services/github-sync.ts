import type { GitHubService } from "./github.js";
import type { GitHubIssueEvent, GitHubPrEvent } from "../schemas/webhook.js";

/** Maps agent_tasks status ↔ GitHub Issue state */
const TASK_TO_ISSUE_STATE: Record<string, "open" | "closed"> = {
  pending: "open",
  running: "open",
  completed: "closed",
  failed: "closed",
};

const ISSUE_ACTION_TO_TASK_STATUS: Record<string, string> = {
  opened: "pending",
  reopened: "pending",
  closed: "completed",
};

/** Maps GitHub PR action+merged → agent_prs status */
function prEventToStatus(action: string, merged: boolean): string | null {
  if (action === "opened") return "open";
  if (action === "closed" && merged) return "merged";
  if (action === "closed" && !merged) return "closed";
  if (action === "reopened") return "open";
  return null;
}

export class GitHubSyncService {
  constructor(
    private github: GitHubService,
    private db: D1Database,
    private orgId: string,
  ) {}

  // ─── Task → GitHub Issue (outbound) ───

  async syncTaskToIssue(taskId: string): Promise<{ issueNumber: number }> {
    const task = await this.db
      .prepare("SELECT * FROM agent_tasks WHERE id = ?")
      .bind(taskId)
      .first<{
        id: string;
        task_type: string | null;
        branch: string;
        pr_status: string;
        result: string | null;
        github_issue_number: number | null;
        created_at: string;
      }>();

    if (!task) throw new Error(`Task not found: ${taskId}`);

    // Already synced — update state instead of creating
    if (task.github_issue_number) {
      const ghState = TASK_TO_ISSUE_STATE[task.pr_status] ?? "open";
      await this.github.updateIssue(task.github_issue_number, { state: ghState });
      return { issueNumber: task.github_issue_number };
    }

    // Create new issue
    const title = task.task_type
      ? `[${task.task_type}] ${task.branch}`
      : `Task: ${task.branch}`;
    const body = [
      `**Task ID:** ${task.id}`,
      `**Branch:** ${task.branch}`,
      `**Status:** ${task.pr_status}`,
      task.result ? `**Result:** ${task.result}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const issue = await this.github.createIssue({
      title,
      body,
      labels: ["foundry-x", task.task_type ?? "task"].filter(Boolean),
    });

    // Store issue number back on the task
    await this.db
      .prepare("UPDATE agent_tasks SET github_issue_number = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(issue.number, taskId)
      .run();

    return { issueNumber: issue.number };
  }

  // ─── GitHub Issue → Task (inbound) ───

  async syncIssueToTask(event: GitHubIssueEvent): Promise<{ taskId: string | null; action: string }> {
    const issueNumber = event.issue.number;
    const newStatus = ISSUE_ACTION_TO_TASK_STATUS[event.action];
    if (!newStatus) {
      return { taskId: null, action: `ignored:${event.action}` };
    }

    // Find task by github_issue_number
    const task = await this.db
      .prepare("SELECT id, pr_status FROM agent_tasks WHERE github_issue_number = ?")
      .bind(issueNumber)
      .first<{ id: string; pr_status: string }>();

    if (!task) {
      return { taskId: null, action: "no_matching_task" };
    }

    // Skip if already in target state
    if (task.pr_status === newStatus) {
      return { taskId: task.id, action: "already_synced" };
    }

    await this.db
      .prepare("UPDATE agent_tasks SET pr_status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(newStatus, task.id)
      .run();

    return { taskId: task.id, action: `updated:${newStatus}` };
  }

  // ─── GitHub PR → agent_prs (inbound) ───

  async syncPrStatus(event: GitHubPrEvent): Promise<{ prRecordId: string | null; action: string }> {
    const prNumber = event.pull_request.number;
    const newStatus = prEventToStatus(event.action, event.pull_request.merged);
    if (!newStatus) {
      return { prRecordId: null, action: `ignored:${event.action}` };
    }

    const pr = await this.db
      .prepare("SELECT id, status FROM agent_prs WHERE pr_number = ?")
      .bind(prNumber)
      .first<{ id: string; status: string }>();

    if (!pr) {
      return { prRecordId: null, action: "no_matching_pr" };
    }

    const updates: string[] = ["status = ?", "updated_at = datetime('now')"];
    const binds: unknown[] = [newStatus];

    if (newStatus === "merged" && event.pull_request.merged_at) {
      updates.push("merged_at = ?");
      binds.push(event.pull_request.merged_at);
    }

    binds.push(pr.id);
    await this.db
      .prepare(`UPDATE agent_prs SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...binds)
      .run();

    return { prRecordId: pr.id, action: `updated:${newStatus}` };
  }
}
