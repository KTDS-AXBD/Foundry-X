import type { GitHubService } from "../modules/portal/services/github.js";
import type { SSEManager } from "../core/infra/types.js";
import type { AutoRebaseService } from "../core/harness/services/auto-rebase.js";
import type {
  MergeQueueEntry,
  MergeQueueStatus,
  ConflictPair,
  ConflictReport,
} from "@foundry-x/shared";

export class MergeQueueService {
  constructor(
    private github: GitHubService,
    private db: D1Database,
    private sse?: SSEManager,
    private autoRebase?: AutoRebaseService,
  ) {}

  async enqueue(
    prRecordId: string,
    prNumber: number,
    agentId: string,
    priority = 1,
  ): Promise<MergeQueueEntry> {
    const id = `mq-${crypto.randomUUID().slice(0, 8)}`;
    const position = await this.getMaxPosition() + 1;

    let modifiedFiles: string[] = [];
    try {
      modifiedFiles = await this.github.getModifiedFiles(prNumber);
    } catch {
      // If we can't get files, proceed with empty list
    }

    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO merge_queue (id, pr_record_id, pr_number, agent_id, priority, position, modified_files, status, conflicts_with, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', '[]', ?, ?)`,
      )
      .bind(id, prRecordId, prNumber, agentId, priority, position, JSON.stringify(modifiedFiles), now, now)
      .run();

    const entry: MergeQueueEntry = {
      id,
      prRecordId,
      prNumber,
      agentId,
      priority,
      position,
      modifiedFiles,
      status: "queued",
      conflictsWith: [],
      rebaseAttempted: false,
      rebaseSucceeded: false,
      createdAt: now,
      mergedAt: null,
    };

    // Detect conflicts after adding
    const conflicts = await this.detectConflicts();

    // Update conflict relations for this entry
    const conflictIds = conflicts.conflicting
      .filter((c) => c.entryA === id || c.entryB === id)
      .map((c) => (c.entryA === id ? c.entryB : c.entryA));

    if (conflictIds.length > 0) {
      await this.updateConflictRelations(id, conflictIds);
      entry.conflictsWith = conflictIds;
    }

    this.pushQueueUpdate();

    return entry;
  }

  async detectConflicts(): Promise<ConflictReport> {
    const entries = await this.getQueuedEntries();
    const conflicting: ConflictPair[] = [];

    // O(n²) file intersection comparison
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i]!;
        const b = entries[j]!;
        const sharedFiles = a.modifiedFiles.filter((f) =>
          b.modifiedFiles.includes(f),
        );
        if (sharedFiles.length > 0) {
          conflicting.push({
            entryA: a.id,
            entryB: b.id,
            files: sharedFiles,
          });
        }
      }
    }

    const suggestedOrder = this.calculateMergeOrder(entries, conflicting);
    const autoResolvable = conflicting.every((c) => c.files.length <= 3);

    const report: ConflictReport = { conflicting, suggestedOrder, autoResolvable };

    if (conflicting.length > 0) {
      this.sse?.pushEvent({
        event: "agent.queue.conflict",
        data: { conflicts: report },
      });
    }

    return report;
  }

  async processNext(): Promise<{
    merged: boolean;
    entryId?: string;
    prNumber?: number;
    commitSha?: string;
    error?: string;
  }> {
    const conflicts = await this.detectConflicts();
    const nextId = conflicts.suggestedOrder[0];
    if (!nextId) return { merged: false, error: "Queue is empty" };

    const entry = await this.getEntry(nextId);
    if (!entry) return { merged: false, error: "Entry not found" };

    // Mark as merging
    await this.updateEntryStatus(entry.id, "merging");

    // Check PR is mergeable
    const [prStatus] = await this.github.getPrStatuses([entry.prNumber]);
    if (!prStatus?.mergeable) {
      await this.updateEntry(entry.id, { rebase_attempted: 1 });

      if (this.autoRebase) {
        // F102: 3-attempt auto-rebase with LLM conflict resolution
        const rebaseResult = await this.autoRebase.rebaseWithRetry(
          entry.agentId,
          "master",
          entry.id,
        );

        this.sse?.pushEvent({
          event: "agent.queue.rebase",
          data: {
            prNumber: entry.prNumber,
            success: rebaseResult.success,
            files: entry.modifiedFiles,
          },
        });

        if (!rebaseResult.success) {
          await this.updateEntryStatus(entry.id, "conflict");
          await this.updateEntry(entry.id, { rebase_succeeded: 0 });
          return {
            merged: false,
            entryId: entry.id,
            prNumber: entry.prNumber,
            error: rebaseResult.escalated ? "Rebase failed (escalated)" : "Rebase failed",
          };
        }

        await this.updateEntry(entry.id, { rebase_succeeded: 1 });
      } else {
        // Legacy: single GitHub API rebase attempt
        const rebaseResult = await this.github.updateBranch(entry.prNumber);

        this.sse?.pushEvent({
          event: "agent.queue.rebase",
          data: {
            prNumber: entry.prNumber,
            success: rebaseResult.updated,
            files: entry.modifiedFiles,
          },
        });

        if (!rebaseResult.updated) {
          await this.updateEntryStatus(entry.id, "conflict");
          await this.updateEntry(entry.id, { rebase_succeeded: 0 });
          return { merged: false, entryId: entry.id, prNumber: entry.prNumber, error: "Rebase failed" };
        }

        await this.updateEntry(entry.id, { rebase_succeeded: 1 });
      }
    }

    // Merge
    try {
      const mergeResult = await this.github.mergePullRequest(entry.prNumber, {
        mergeMethod: "squash",
      });

      const now = new Date().toISOString();
      await this.updateEntryStatus(entry.id, "merged");
      await this.updateEntry(entry.id, { merged_at: now });

      this.sse?.pushEvent({
        event: "agent.queue.merged",
        data: {
          entryId: entry.id,
          prNumber: entry.prNumber,
          position: entry.position,
          commitSha: mergeResult.sha,
        },
      });

      await this.reorderQueue();
      this.pushQueueUpdate();

      return { merged: true, entryId: entry.id, prNumber: entry.prNumber, commitSha: mergeResult.sha };
    } catch (err) {
      await this.updateEntryStatus(entry.id, "failed");
      return {
        merged: false,
        entryId: entry.id,
        prNumber: entry.prNumber,
        error: err instanceof Error ? err.message : "Merge failed",
      };
    }
  }

  async getQueueStatus(): Promise<MergeQueueEntry[]> {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM merge_queue
         WHERE status IN ('queued', 'merging')
         ORDER BY position`,
      )
      .all<Record<string, unknown>>();

    return results.map((r) => this.mapEntry(r));
  }

  async updatePriority(entryId: string, newPriority: number): Promise<void> {
    await this.db
      .prepare("UPDATE merge_queue SET priority = ?, updated_at = ? WHERE id = ?")
      .bind(newPriority, new Date().toISOString(), entryId)
      .run();
    await this.reorderQueue();
    this.pushQueueUpdate();
  }

  // ─── Private helpers ───

  private async getQueuedEntries(): Promise<MergeQueueEntry[]> {
    const { results } = await this.db
      .prepare(
        `SELECT * FROM merge_queue
         WHERE status IN ('queued', 'merging')
         ORDER BY position`,
      )
      .all<Record<string, unknown>>();

    return results.map((r) => this.mapEntry(r));
  }

  private async getEntry(id: string): Promise<MergeQueueEntry | null> {
    const row = await this.db
      .prepare("SELECT * FROM merge_queue WHERE id = ?")
      .bind(id)
      .first<Record<string, unknown>>();

    return row ? this.mapEntry(row) : null;
  }

  private async getMaxPosition(): Promise<number> {
    const row = await this.db
      .prepare("SELECT MAX(position) as max_pos FROM merge_queue WHERE status IN ('queued', 'merging')")
      .first<{ max_pos: number | null }>();
    return row?.max_pos ?? 0;
  }

  private async updateEntryStatus(id: string, status: MergeQueueStatus): Promise<void> {
    await this.db
      .prepare("UPDATE merge_queue SET status = ?, updated_at = ? WHERE id = ?")
      .bind(status, new Date().toISOString(), id)
      .run();
  }

  private async updateEntry(id: string, fields: Record<string, unknown>): Promise<void> {
    const sets = Object.keys(fields).map((k) => `${k} = ?`).join(", ");
    const values = Object.values(fields);
    await this.db
      .prepare(`UPDATE merge_queue SET ${sets}, updated_at = ? WHERE id = ?`)
      .bind(...values, new Date().toISOString(), id)
      .run();
  }

  private async updateConflictRelations(entryId: string, conflictIds: string[]): Promise<void> {
    await this.db
      .prepare("UPDATE merge_queue SET conflicts_with = ?, updated_at = ? WHERE id = ?")
      .bind(JSON.stringify(conflictIds), new Date().toISOString(), entryId)
      .run();
  }

  private async reorderQueue(): Promise<void> {
    const entries = await this.getQueuedEntries();
    // Sort: no conflicts first, then by priority (higher first), then by position
    entries.sort((a, b) => {
      const aConflicts = a.conflictsWith.length;
      const bConflicts = b.conflictsWith.length;
      if (aConflicts !== bConflicts) return aConflicts - bConflicts;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.position - b.position;
    });

    for (let i = 0; i < entries.length; i++) {
      await this.db
        .prepare("UPDATE merge_queue SET position = ? WHERE id = ?")
        .bind(i + 1, entries[i]!.id)
        .run();
    }
  }

  private calculateMergeOrder(
    entries: MergeQueueEntry[],
    conflicts: ConflictPair[],
  ): string[] {
    const conflictSet = new Set<string>();
    for (const c of conflicts) {
      conflictSet.add(c.entryA);
      conflictSet.add(c.entryB);
    }

    // Non-conflicting first, then by priority desc, then by position
    const sorted = [...entries].sort((a, b) => {
      const aHasConflict = conflictSet.has(a.id) ? 1 : 0;
      const bHasConflict = conflictSet.has(b.id) ? 1 : 0;
      if (aHasConflict !== bHasConflict) return aHasConflict - bHasConflict;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.position - b.position;
    });

    return sorted.map((e) => e.id);
  }

  private mapEntry(row: Record<string, unknown>): MergeQueueEntry {
    return {
      id: row.id as string,
      prRecordId: row.pr_record_id as string,
      prNumber: row.pr_number as number,
      agentId: row.agent_id as string,
      priority: row.priority as number,
      position: row.position as number,
      modifiedFiles: JSON.parse((row.modified_files as string) || "[]"),
      status: row.status as MergeQueueStatus,
      conflictsWith: JSON.parse((row.conflicts_with as string) || "[]"),
      rebaseAttempted: (row.rebase_attempted as number) === 1,
      rebaseSucceeded: (row.rebase_succeeded as number) === 1,
      createdAt: row.created_at as string,
      mergedAt: (row.merged_at as string) ?? null,
    };
  }

  private getQueueSummary(entries: MergeQueueEntry[]) {
    return entries.map((e) => ({
      id: e.id,
      prNumber: e.prNumber,
      agentId: e.agentId,
      position: e.position,
      status: e.status,
    }));
  }

  private pushQueueUpdate(): void {
    if (!this.sse) return;
    // Fire async, don't block
    this.getQueuedEntries().then((entries) => {
      this.sse?.pushEvent({
        event: "agent.queue.updated",
        data: {
          queue: this.getQueueSummary(entries),
          totalPrs: entries.length,
        },
      });
    }).catch(() => {});
  }
}
