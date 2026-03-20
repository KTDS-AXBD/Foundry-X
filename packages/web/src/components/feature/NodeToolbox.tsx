"use client";

const NODE_TYPES = [
  { type: "trigger", label: "Trigger", color: "bg-green-500" },
  { type: "action:run_agent", label: "Agent Run", color: "bg-blue-500" },
  { type: "action:create_pr", label: "Create PR", color: "bg-blue-500" },
  { type: "action:send_notification", label: "Notify", color: "bg-blue-500" },
  { type: "action:wait_approval", label: "Wait", color: "bg-blue-500" },
  { type: "action:run_analysis", label: "Analysis", color: "bg-blue-500" },
  { type: "condition", label: "Condition", color: "bg-yellow-500" },
  { type: "end", label: "End", color: "bg-gray-500" },
] as const;

export default function NodeToolbox() {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData("application/reactflow-type", nodeType);
    event.dataTransfer.setData("application/reactflow-label", label);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground">Toolbox</h3>
      {NODE_TYPES.map(({ type, label, color }) => (
        <div
          key={type}
          draggable
          onDragStart={(e) => onDragStart(e, type, label)}
          className="flex cursor-grab items-center gap-2 rounded border border-border p-2 text-sm transition-colors hover:bg-accent active:cursor-grabbing"
        >
          <span className={`h-3 w-3 rounded-full ${color}`} />
          {label}
        </div>
      ))}
    </div>
  );
}
