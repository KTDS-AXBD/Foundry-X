"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getWorkflows, createWorkflow, deleteWorkflow, type Workflow } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const ORG_ID_KEY = "orgId";

function useOrgId(): string {
  const [orgId, setOrgId] = useState("");
  useEffect(() => {
    setOrgId(localStorage.getItem(ORG_ID_KEY) ?? "");
  }, []);
  return orgId;
}

export default function WorkflowListPage() {
  const orgId = useOrgId();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    getWorkflows(orgId)
      .then(setWorkflows)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orgId]);

  const handleCreate = async () => {
    if (!orgId) return;
    const wf = await createWorkflow(orgId, {
      name: `Workflow ${workflows.length + 1}`,
      description: "",
      definition: {
        nodes: [
          { id: "trigger-1", type: "trigger", label: "Start", position: { x: 250, y: 50 }, data: {} },
          { id: "end-1", type: "end", label: "End", position: { x: 250, y: 300 }, data: {} },
        ],
        edges: [{ id: "e-1", source: "trigger-1", target: "end-1" }],
      },
    });
    setWorkflows((prev) => [...prev, wf]);
  };

  const handleDelete = async (id: string) => {
    if (!orgId) return;
    await deleteWorkflow(orgId, id);
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
  };

  if (!orgId) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Workflows</h1>
        <p className="text-muted-foreground">Organization을 먼저 선택해주세요.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workflows</h1>
        <button
          onClick={handleCreate}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + New Workflow
        </button>
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="mb-2 h-5 w-32" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && workflows.length === 0 && (
        <p className="text-muted-foreground">
          워크플로우가 없어요. &ldquo;+ New Workflow&rdquo; 버튼으로 생성할 수 있어요.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {workflows.map((wf) => (
          <Card key={wf.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <Link href={`/workflows/${wf.id}`} className="font-semibold hover:underline">
                  {wf.name}
                </Link>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    wf.enabled
                      ? "bg-green-500/10 text-green-500"
                      : "bg-gray-500/10 text-gray-500"
                  }`}
                >
                  {wf.enabled ? "Active" : "Inactive"}
                </span>
              </div>
              {wf.description && (
                <p className="mb-2 text-sm text-muted-foreground">{wf.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {wf.definition.nodes.length} nodes · {wf.definition.edges.length} edges
                </span>
                <div className="flex gap-2">
                  <Link
                    href={`/workflows/${wf.id}`}
                    className="text-primary hover:underline"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(wf.id)}
                    className="text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
