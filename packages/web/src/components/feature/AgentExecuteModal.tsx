"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { executeAgentTask, type AgentExecutionResult } from "@/lib/api-client";

interface AgentExecuteModalProps {
  agentId: string;
  agentName: string;
  onClose: () => void;
  onResult: (result: AgentExecutionResult) => void;
}

const TASK_TYPES = [
  { value: "code-review", label: "코드 리뷰", desc: "코드 품질, 보안, 패턴 분석" },
  { value: "code-generation", label: "코드 생성", desc: "spec 기반 코드 구현" },
  { value: "spec-analysis", label: "Spec 분석", desc: "명세 완전성·일관성 평가" },
  { value: "test-generation", label: "테스트 생성", desc: "테스트 케이스 자동 작성" },
] as const;

export function AgentExecuteModal({
  agentId,
  agentName,
  onClose,
  onResult,
}: AgentExecuteModalProps) {
  const [taskType, setTaskType] = useState<string>("code-review");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await executeAgentTask(agentId, taskType, {
        instructions: instructions || undefined,
      });
      onResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "실행 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {agentName} — 작업 실행
            </h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">작업 유형</label>
            <div className="grid grid-cols-2 gap-2">
              {TASK_TYPES.map((tt) => (
                <button
                  key={tt.value}
                  className={`rounded border p-2 text-left text-sm transition-colors ${
                    taskType === tt.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted"
                  }`}
                  onClick={() => setTaskType(tt.value)}
                >
                  <div className="font-medium">{tt.label}</div>
                  <div className="text-xs text-muted-foreground">{tt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              추가 지시사항 (선택)
            </label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="예: packages/api/src/routes/ 디렉토리의 에러 핸들링을 분석해주세요"
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              취소
            </Button>
            <Button onClick={handleExecute} disabled={loading}>
              {loading ? "실행 중..." : "실행"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
