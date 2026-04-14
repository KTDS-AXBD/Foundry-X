/**
 * F535: DiscoveryGraphPanel — Graph 모드 실행 UI
 * Sprint 288
 */
import { useState, useEffect, useCallback } from "react";
import { Loader2, Play, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { runDiscoveryGraph, getGraphSessions, type GraphSession } from "@/lib/api-client";

interface DiscoveryGraphPanelProps {
  bizItemId: string;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  running: { label: "실행 중", variant: "secondary" },
  completed: { label: "완료", variant: "default" },
  failed: { label: "실패", variant: "destructive" },
};

export function DiscoveryGraphPanel({ bizItemId }: DiscoveryGraphPanelProps) {
  const [running, setRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<GraphSession[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refreshSessions = useCallback(async () => {
    try {
      const res = await getGraphSessions(bizItemId);
      setSessions(res.sessions);
      if (res.latestSessionId && !sessionId) {
        setSessionId(res.latestSessionId);
      }
    } catch {
      // 세션 목록 조회 실패는 무시 (메인 기능 아님)
    }
  }, [bizItemId, sessionId]);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  async function handleRunGraph() {
    setRunning(true);
    setError(null);
    try {
      const res = await runDiscoveryGraph(bizItemId);
      setSessionId(res.sessionId);
      await refreshSessions();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Graph 실행에 실패했어요.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Graph 모드 실행</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            9단계 발굴 파이프라인을 GraphEngine으로 전체 실행해요
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => { void handleRunGraph(); }}
          disabled={running}
          data-testid="graph-run-button"
        >
          {running ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              실행 중...
            </>
          ) : (
            <>
              <Play className="mr-1.5 h-4 w-4" />
              Graph 모드 실행
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="rounded bg-destructive/10 px-3 py-2 text-xs text-destructive" data-testid="graph-error">
          {error}
        </div>
      )}

      {sessionId && (
        <div className="text-xs text-muted-foreground" data-testid="session-id-display">
          최근 세션: <code className="font-mono">{sessionId}</code>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">세션 이력</p>
          {sessions.slice(0, 5).map((s) => {
            const badge = STATUS_BADGE[s.status] ?? STATUS_BADGE.failed;
            return (
              <div key={s.id} className="flex items-center gap-2 text-xs">
                {s.status === "completed" && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                {s.status === "failed" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                {s.status === "running" && <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className="font-mono text-muted-foreground truncate max-w-[200px]">{s.id}</span>
                <Badge variant={badge.variant} className="text-[10px] py-0">{badge.label}</Badge>
                <span className="text-muted-foreground">{new Date(s.startedAt).toLocaleString("ko-KR")}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
