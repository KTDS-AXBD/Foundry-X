"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { CoverageGapResponse } from "@/lib/api-client";

interface CoverageGapViewProps {
  result: CoverageGapResponse;
}

const priorityStyles: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400",
};

export function CoverageGapView({ result }: CoverageGapViewProps) {
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          {result.analyzedFiles}개 파일 분석
        </span>
        <span className={`rounded px-2 py-0.5 ${
          result.overallCoverage >= 80
            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
            : result.overallCoverage >= 50
              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
        }`}>
          커버리지 {result.overallCoverage}%
        </span>
        <span className="text-muted-foreground">
          {result.model} · {result.tokensUsed.toLocaleString()} tokens
        </span>
      </div>

      {/* Uncovered Functions */}
      {result.uncoveredFunctions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-2 text-sm font-medium">
              미커버 함수 ({result.uncoveredFunctions.length}개)
            </h4>
            <div className="overflow-auto rounded border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left">파일</th>
                    <th className="px-3 py-2 text-left">함수</th>
                    <th className="px-3 py-2 text-left">복잡도</th>
                    <th className="px-3 py-2 text-left">우선순위</th>
                  </tr>
                </thead>
                <tbody>
                  {result.uncoveredFunctions.map((fn, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 font-mono">{fn.file}</td>
                      <td className="px-3 py-2 font-mono">{fn.function}</td>
                      <td className="px-3 py-2">{fn.complexity}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded px-1.5 py-0.5 text-xs ${priorityStyles[fn.priority] ?? ""}`}>
                          {fn.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missing Edge Cases */}
      {result.missingEdgeCases.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-2 text-sm font-medium">
              누락 엣지케이스 ({result.missingEdgeCases.length}건)
            </h4>
            <div className="space-y-3">
              {result.missingEdgeCases.map((item, i) => (
                <div key={i} className="rounded border p-3">
                  <div className="mb-1 font-mono text-xs text-muted-foreground">
                    {item.file} → {item.function}
                  </div>
                  <ul className="list-inside list-disc space-y-0.5 text-xs">
                    {item.suggestedCases.map((c, j) => (
                      <li key={j}>{c}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {result.uncoveredFunctions.length === 0 && result.missingEdgeCases.length === 0 && (
        <p className="text-sm text-muted-foreground">
          모든 함수가 커버되어 있고, 추가 엣지케이스가 없어요.
        </p>
      )}
    </div>
  );
}
