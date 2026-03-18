"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { AgentExecutionResult } from "@/lib/api-client";

interface AgentTaskResultProps {
  result: AgentExecutionResult;
}

const statusStyles: Record<string, string> = {
  success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  partial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function AgentTaskResult({ result }: AgentTaskResultProps) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">실행 결과</h3>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${statusStyles[result.status] ?? ""}`}
          >
            {result.status}
          </span>
        </div>

        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Model: {result.model}</span>
          <span>Tokens: {result.tokensUsed.toLocaleString()}</span>
          <span>Duration: {(result.duration / 1000).toFixed(1)}s</span>
        </div>

        {result.output.analysis && (
          <div>
            <h4 className="mb-1 text-xs font-medium">분석</h4>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-xs">
              {result.output.analysis}
            </pre>
          </div>
        )}

        {result.output.reviewComments &&
          result.output.reviewComments.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-medium">
                리뷰 코멘트 ({result.output.reviewComments.length}건)
              </h4>
              <div className="space-y-2">
                {result.output.reviewComments.map((comment, i) => (
                  <div
                    key={i}
                    className="rounded border p-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{comment.file}:{comment.line}</span>
                      <span
                        className={`rounded px-1 ${
                          comment.severity === "error"
                            ? "bg-red-100 text-red-700"
                            : comment.severity === "warning"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {comment.severity}
                      </span>
                    </div>
                    <p className="mt-1">{comment.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        {result.output.generatedCode &&
          result.output.generatedCode.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-medium">
                생성된 코드 ({result.output.generatedCode.length}파일)
              </h4>
              {result.output.generatedCode.map((file, i) => (
                <div key={i} className="mb-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono">{file.path}</span>
                    <span className="rounded bg-muted px-1">{file.action}</span>
                  </div>
                  <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                    {file.content}
                  </pre>
                </div>
              ))}
            </div>
          )}
      </CardContent>
    </Card>
  );
}
