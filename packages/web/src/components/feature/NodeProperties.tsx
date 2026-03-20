"use client";

import type { WorkflowNode } from "@/lib/api-client";

interface Props {
  node: WorkflowNode | null;
  onUpdate: (id: string, data: WorkflowNode["data"]) => void;
}

const ACTION_TYPES = [
  { value: "run_agent", label: "Run Agent" },
  { value: "create_pr", label: "Create PR" },
  { value: "send_notification", label: "Send Notification" },
  { value: "run_analysis", label: "Run Analysis" },
  { value: "wait_approval", label: "Wait for Approval" },
] as const;

export default function NodeProperties({ node, onUpdate }: Props) {
  if (!node) {
    return (
      <div className="rounded border border-border p-4 text-sm text-muted-foreground">
        Select a node to edit its properties
      </div>
    );
  }

  return (
    <div className="rounded border border-border p-4">
      <h3 className="mb-3 text-sm font-semibold">Properties: {node.label}</h3>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Type</label>
          <div className="rounded bg-muted px-2 py-1 text-sm capitalize">{node.type}</div>
        </div>

        {node.type === "action" && (
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Action</label>
            <select
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
              value={node.data.actionType ?? ""}
              onChange={(e) =>
                onUpdate(node.id, {
                  ...node.data,
                  actionType: e.target.value as WorkflowNode["data"]["actionType"],
                })
              }
            >
              <option value="">Select action...</option>
              {ACTION_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        )}

        {node.data.actionType === "run_agent" && (
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Agent ID</label>
            <input
              type="text"
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
              placeholder="e.g. planner-agent"
              value={(node.data.config?.agentId as string) ?? ""}
              onChange={(e) =>
                onUpdate(node.id, {
                  ...node.data,
                  config: { ...node.data.config, agentId: e.target.value },
                })
              }
            />
          </div>
        )}

        {node.data.actionType === "send_notification" && (
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Channel</label>
            <input
              type="text"
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
              placeholder="e.g. #foundry-x"
              value={(node.data.config?.channel as string) ?? ""}
              onChange={(e) =>
                onUpdate(node.id, {
                  ...node.data,
                  config: { ...node.data.config, channel: e.target.value },
                })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
