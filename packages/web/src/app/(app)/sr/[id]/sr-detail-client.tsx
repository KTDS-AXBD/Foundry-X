"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchSrDetail, fetchApi } from "@/lib/api-client";
import type { SrDetailItem, SrFeedbackItem, SrWorkflowNodeClient } from "@/lib/api-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SrWorkflowDag from "@/components/feature/SrWorkflowDag";
import SrFeedbackDialog from "@/components/feature/SrFeedbackDialog";

function formatType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SrDetailClient() {
  const params = useParams();
  const id = params.id as string;

  const [sr, setSr] = useState<SrDetailItem | null>(null);
  const [feedbacks, setFeedbacks] = useState<SrFeedbackItem[]>([]);
  const [workflowNodes, setWorkflowNodes] = useState<SrWorkflowNodeClient[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadData() {
    setLoading(true);
    setError(null);

    Promise.all([
      fetchSrDetail(id),
      fetchApi<{ feedbacks: SrFeedbackItem[] }>(`/sr/${id}/feedback`),
    ])
      .then(([detail, fbData]) => {
        setSr(detail);
        setFeedbacks(fbData.feedbacks ?? []);

        if (detail.workflow_run) {
          const completed = detail.workflow_run.steps_completed;
          const total = detail.workflow_run.steps_total;
          const runStatus = detail.workflow_run.status;

          const nodes: SrWorkflowNodeClient[] = Array.from({ length: total }, (_, i) => ({
            id: `step-${i}`,
            type: "agent" as const,
            label: `Step ${i + 1}`,
            status: i < completed ? "done" : i === completed && runStatus === "running" ? "running" : "pending",
          }));
          setWorkflowNodes(nodes);
        }
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  if (loading) return <p className="text-muted-foreground">Loading SR detail...</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!sr) return <p className="text-muted-foreground">SR not found</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">SR Detail</h1>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>{sr.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <div>
              <span className="text-sm text-muted-foreground">Type</span>
              <div className="mt-1"><Badge variant="secondary">{formatType(sr.sr_type)}</Badge></div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Confidence</span>
              <div className="mt-1 font-medium">
                {(sr.confidence * 100).toFixed(0)}%
                {sr.confidence < 0.7 && (
                  <Badge variant="outline" className="ml-1 text-xs text-yellow-600 dark:text-yellow-400 border-yellow-400">
                    LLM 폴백
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Status</span>
              <div className="mt-1"><Badge>{formatType(sr.status)}</Badge></div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Priority</span>
              <p className={sr.priority === "high" ? "text-destructive font-medium" : ""}>{formatType(sr.priority)}</p>
            </div>
            {sr.matched_keywords.length > 0 && (
              <div className="col-span-full">
                <span className="text-sm text-muted-foreground">Keywords</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {sr.matched_keywords.map((kw) => (
                    <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workflow DAG */}
      {workflowNodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <SrWorkflowDag nodes={workflowNodes} />
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div>
        <Button onClick={() => setDialogOpen(true)}>분류 수정</Button>
      </div>

      <SrFeedbackDialog
        srId={id}
        currentType={sr.sr_type}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={loadData}
      />

      {/* Feedback History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feedback History</CardTitle>
        </CardHeader>
        <CardContent>
          {feedbacks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feedback submitted yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {feedbacks.map((fb) => (
                <div key={fb.id} className="rounded-md border p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{formatType(fb.original_type)}</Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge variant="secondary">{formatType(fb.corrected_type)}</Badge>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(fb.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {fb.reason && <p className="mt-1 text-sm text-muted-foreground">{fb.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
