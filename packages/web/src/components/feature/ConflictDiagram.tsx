"use client";

import type { ConflictReport, MergeQueueEntry } from "@/lib/api-client";

interface ConflictDiagramProps {
  conflicts: ConflictReport;
  entries: MergeQueueEntry[];
}

export function ConflictDiagram({ conflicts, entries }: ConflictDiagramProps) {
  if (conflicts.conflicting.length === 0) {
    return (
      <div className="rounded-md border p-3 text-sm text-muted-foreground">
        No conflicts detected
      </div>
    );
  }

  const getEntryLabel = (entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    return entry ? `PR #${entry.prNumber}` : entryId.slice(0, 8);
  };

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="text-xs font-medium text-muted-foreground">
        Conflict Map ({conflicts.conflicting.length} conflict{conflicts.conflicting.length > 1 ? "s" : ""})
      </div>

      {conflicts.conflicting.map((pair, idx) => (
        <div key={idx} className="flex items-center gap-2 text-sm">
          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-mono">
            {getEntryLabel(pair.entryA)}
          </span>
          <div className="flex-1 flex items-center gap-1">
            <div className="h-px flex-1 bg-destructive/50" />
            <div className="flex flex-wrap gap-1">
              {pair.files.map((file) => (
                <span
                  key={file}
                  className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-xs font-mono"
                >
                  {file.split("/").pop()}
                </span>
              ))}
            </div>
            <div className="h-px flex-1 bg-destructive/50" />
          </div>
          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs font-mono">
            {getEntryLabel(pair.entryB)}
          </span>
        </div>
      ))}

      <div className="text-xs text-muted-foreground border-t pt-2">
        Auto-resolvable: {conflicts.autoResolvable ? "✅ Yes (rebase)" : "❌ Manual review needed"}
      </div>

      {conflicts.suggestedOrder.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Suggested order: {conflicts.suggestedOrder.map((id) => getEntryLabel(id)).join(" → ")}
        </div>
      )}
    </div>
  );
}
