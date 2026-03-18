"use client";

import { useState } from "react";
import { executeParallel } from "@/lib/api-client";

interface AgentOption {
  id: string;
  name: string;
}

interface ParallelExecutionFormProps {
  agents: AgentOption[];
  onResult?: (result: Record<string, unknown>) => void;
}

const TASK_TYPES = ["code-review", "code-generation", "spec-analysis", "test-generation"] as const;

export function ParallelExecutionForm({ agents, onResult }: ParallelExecutionFormProps) {
  const [tasks, setTasks] = useState<
    Array<{ agentId: string; taskType: string; instructions: string }>
  >([
    { agentId: agents[0]?.id ?? "", taskType: "code-review", instructions: "" },
    { agentId: agents[1]?.id ?? agents[0]?.id ?? "", taskType: "code-generation", instructions: "" },
  ]);
  const [createPrs, setCreatePrs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTask = () => {
    if (tasks.length >= 5) return;
    setTasks([...tasks, { agentId: agents[0]?.id ?? "", taskType: "code-review", instructions: "" }]);
  };

  const removeTask = (index: number) => {
    if (tasks.length <= 2) return;
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, field: string, value: string) => {
    setTasks(tasks.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const result = await executeParallel(
        tasks.map((t) => ({
          agentId: t.agentId,
          taskType: t.taskType,
          context: {
            instructions: t.instructions || undefined,
          },
        })),
        createPrs,
      );
      onResult?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Parallel Execution</h3>
        <button
          onClick={addTask}
          disabled={tasks.length >= 5}
          className="text-xs px-2 py-1 rounded border hover:bg-accent disabled:opacity-50"
        >
          + Add Task
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>
      )}

      <div className="space-y-2">
        {tasks.map((task, idx) => (
          <div key={idx} className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Task {idx + 1}</span>
              {tasks.length > 2 && (
                <button
                  onClick={() => removeTask(idx)}
                  className="text-xs text-destructive hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={task.agentId}
                onChange={(e) => updateTask(idx, "agentId", e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-background"
              >
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <select
                value={task.taskType}
                onChange={(e) => updateTask(idx, "taskType", e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-background"
              >
                {TASK_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              placeholder="Instructions (optional)"
              value={task.instructions}
              onChange={(e) => updateTask(idx, "instructions", e.target.value)}
              className="w-full text-xs border rounded px-2 py-1 bg-background"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={createPrs}
            onChange={(e) => setCreatePrs(e.target.checked)}
            className="rounded"
          />
          Create PRs automatically
        </label>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {submitting ? "Executing..." : `Execute ${tasks.length} Tasks`}
        </button>
      </div>
    </div>
  );
}
