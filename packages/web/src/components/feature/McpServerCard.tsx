"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  testMcpServer,
  deleteMcpServer,
  type McpServerInfo,
  type McpTestResult,
} from "@/lib/api-client";

interface McpServerCardProps {
  server: McpServerInfo;
  onDeleted: () => void;
  onUpdated: () => void;
}

export function McpServerCard({ server, onDeleted, onUpdated }: McpServerCardProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<McpTestResult | null>(null);
  const [deleting, setDeleting] = useState(false);

  const statusColor =
    server.status === "active"
      ? "text-green-500"
      : server.status === "error"
        ? "text-red-500"
        : "text-gray-400";

  const statusDot =
    server.status === "active"
      ? "bg-green-500"
      : server.status === "error"
        ? "bg-red-500"
        : "bg-gray-400";

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testMcpServer(server.id);
      setTestResult(result);
      onUpdated();
    } catch (err) {
      setTestResult({
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`"${server.name}" 서버를 삭제할까요?`)) return;
    setDeleting(true);
    try {
      await deleteMcpServer(server.id);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  const lastConnected = server.lastConnectedAt
    ? new Date(server.lastConnectedAt).toLocaleString("ko-KR")
    : "없음";

  return (
    <Card className="border border-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{server.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
              {server.transportType}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${statusDot}`} />
            <span className={`text-xs ${statusColor}`}>{server.status}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground font-mono truncate">
          {server.serverUrl}
        </p>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>도구: {server.toolCount}개</span>
          <span>마지막 연결: {lastConnected}</span>
        </div>

        {server.errorMessage && (
          <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded p-2">
            {server.errorMessage}
          </p>
        )}

        {testResult && (
          <div
            className={`text-xs rounded p-2 ${
              testResult.status === "connected"
                ? "text-green-700 bg-green-50 dark:bg-green-950/30"
                : "text-red-700 bg-red-50 dark:bg-red-950/30"
            }`}
          >
            {testResult.status === "connected"
              ? `연결 성공 — ${testResult.toolCount ?? 0}개 도구 발견`
              : `연결 실패 — ${testResult.error}`}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testing}
          >
            {testing ? "테스트 중..." : "연결 테스트"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "삭제 중..." : "삭제"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
