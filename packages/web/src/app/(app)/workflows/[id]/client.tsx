"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  getWorkflow,
  updateWorkflow,
  executeWorkflow,
  type Workflow,
  type WorkflowDefinition,
  type WorkflowNode,
} from "@/lib/api-client";
import NodeToolbox from "@/components/feature/NodeToolbox";
import NodeProperties from "@/components/feature/NodeProperties";
import { Skeleton } from "@/components/ui/skeleton";

const WorkflowCanvas = dynamic(
  () => import("@/components/feature/WorkflowCanvas"),
  { ssr: false, loading: () => <div className="flex h-96 items-center justify-center text-muted-foreground">Loading editor...</div> },
);

const ORG_ID_KEY = "orgId";

function useOrgId(): string {
  const [orgId, setOrgId] = useState("");
  useEffect(() => {
    setOrgId(localStorage.getItem(ORG_ID_KEY) ?? "");
  }, []);
  return orgId;
}

export default function WorkflowEditorClient() {
  const params = useParams();
  const router = useRouter();
  const orgId = useOrgId();
  const workflowId = params.id as string;

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [definition, setDefinition] = useState<WorkflowDefinition | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !workflowId) return;
    getWorkflow(orgId, workflowId)
      .then((wf) => {
        setWorkflow(wf);
        setDefinition(wf.definition);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [orgId, workflowId]);

  const handleDefChange = useCallback((def: WorkflowDefinition) => {
    setDefinition(def);
  }, []);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleNodeUpdate = useCallback(
    (nodeId: string, data: WorkflowNode["data"]) => {
      setDefinition((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          nodes: prev.nodes.map((n) =>
            n.id === nodeId ? { ...n, data } : n,
          ),
        };
      });
    },
    [],
  );

  const handleSave = async () => {
    if (!orgId || !workflowId || !definition) return;
    setSaving(true);
    try {
      const updated = await updateWorkflow(orgId, workflowId, { definition });
      setWorkflow(updated);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleExecute = async () => {
    if (!orgId || !workflowId) return;
    setExecuting(true);
    try {
      await executeWorkflow(orgId, workflowId);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExecuting(false);
    }
  };

  const selectedNode = definition?.nodes.find((n) => n.id === selectedNodeId) ?? null;

  if (!orgId) {
    return <p className="text-muted-foreground">Organization을 먼저 선택해주세요.</p>;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/workflows")} className="text-sm text-muted-foreground hover:text-foreground">
            ← Back
          </button>
          <h1 className="text-xl font-bold">{workflow?.name ?? "Workflow"}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleExecute}
            disabled={executing}
            className="rounded border border-green-500 px-4 py-1.5 text-sm font-medium text-green-500 hover:bg-green-500/10 disabled:opacity-50"
          >
            {executing ? "Running..." : "▶ Execute"}
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-3 overflow-hidden pt-3">
        <div className="w-36 shrink-0 overflow-y-auto">
          <NodeToolbox />
        </div>
        <div className="flex-1 rounded border border-border">
          {definition && (
            <WorkflowCanvas
              definition={definition}
              onChange={handleDefChange}
              onNodeSelect={handleNodeSelect}
            />
          )}
        </div>
      </div>

      <div className="mt-3 shrink-0">
        <NodeProperties node={selectedNode} onUpdate={handleNodeUpdate} />
      </div>
    </div>
  );
}
