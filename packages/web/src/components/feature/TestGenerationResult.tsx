"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TestGenerationResponse } from "@/lib/api-client";

interface TestGenerationResultProps {
  result: TestGenerationResponse;
}

export function TestGenerationResult({ result }: TestGenerationResultProps) {
  const [activeFile, setActiveFile] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="rounded bg-green-100 px-2 py-0.5 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          {result.totalTestCount}개 테스트
        </span>
        <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          커버리지 추정 {result.coverageEstimate}%
        </span>
        <span className="text-muted-foreground">
          {result.model} · {(result.duration / 1000).toFixed(1)}s · {result.tokensUsed.toLocaleString()} tokens
        </span>
      </div>

      {/* File tabs */}
      {result.testFiles.length > 1 && (
        <div className="flex gap-1 border-b">
          {result.testFiles.map((file, i) => (
            <button
              key={file.path}
              onClick={() => setActiveFile(i)}
              className={`px-3 py-1.5 text-xs font-mono border-b-2 transition-colors ${
                activeFile === i
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {file.path} ({file.testCount})
            </button>
          ))}
        </div>
      )}

      {/* Active file content */}
      {result.testFiles[activeFile] && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">
                {result.testFiles[activeFile].path}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(result.testFiles[activeFile].content)}
              >
                {copied ? "복사됨!" : "복사"}
              </Button>
            </div>
            <pre className="max-h-96 overflow-auto rounded bg-muted p-3 text-xs">
              {result.testFiles[activeFile].content}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Edge cases */}
      {result.edgeCases.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium">추천 엣지케이스</h4>
          <div className="overflow-auto rounded border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left">함수</th>
                  <th className="px-3 py-2 text-left">케이스</th>
                  <th className="px-3 py-2 text-left">카테고리</th>
                </tr>
              </thead>
              <tbody>
                {result.edgeCases.map((ec, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono">{ec.function}</td>
                    <td className="px-3 py-2">{ec.case}</td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-muted px-1.5 py-0.5">{ec.category}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
