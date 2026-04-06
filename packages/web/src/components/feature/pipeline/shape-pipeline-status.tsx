/**
 * F379: Shape Pipeline Status — 발굴→형상화 파이프라인 상태 (Sprint 171)
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AdaptTone, ShapePipelineStatusResponse } from "@/lib/api-client";
import { fetchShapePipelineStatus, triggerShapePipeline } from "@/lib/api-client";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  idle: { label: "대기", variant: "outline" },
  processing: { label: "처리 중", variant: "secondary" },
  completed: { label: "완료", variant: "default" },
  failed: { label: "실패", variant: "destructive" },
};

interface ShapePipelineStatusProps {
  itemId: string;
  onOfferingCreated?: (offeringId: string) => void;
}

export function ShapePipelineStatus({ itemId, onOfferingCreated }: ShapePipelineStatusProps) {
  const [status, setStatus] = useState<ShapePipelineStatusResponse | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchShapePipelineStatus(itemId)
      .then(setStatus)
      .catch(() => setStatus({ status: "idle" }));
  }, [itemId]);

  const handleTrigger = async (tone: AdaptTone = "executive") => {
    setTriggering(true);
    setError(null);
    try {
      const result = await triggerShapePipeline(itemId, tone);
      if (result.status === "failed") {
        setError(result.error ?? "파이프라인 실패");
      } else {
        setStatus({
          status: "completed",
          offering: {
            id: result.offeringId,
            title: "",
            prefilledCount: result.prefilledSections,
          },
        });
        onOfferingCreated?.(result.offeringId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setTriggering(false);
    }
  };

  if (!status) return null;

  const statusInfo = STATUS_LABELS[status.status] ?? STATUS_LABELS.idle;

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">형상화 파이프라인</span>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        {status.status === "idle" && (
          <Button
            size="sm"
            onClick={() => handleTrigger()}
            disabled={triggering}
          >
            {triggering ? "생성 중..." : "사업기획서 생성"}
          </Button>
        )}
      </div>

      {status.offering && (
        <div className="text-sm text-muted-foreground">
          <a
            href={`/app/offerings/${status.offering.id}`}
            className="text-primary hover:underline"
          >
            {status.offering.title || "사업기획서 보기"}
          </a>
          <span className="ml-2">
            ({status.offering.prefilledCount}개 섹션 프리필 완료)
          </span>
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}
    </div>
  );
}
