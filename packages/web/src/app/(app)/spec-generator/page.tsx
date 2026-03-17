"use client";

import { useState } from "react";
import { generateSpec, type SpecGenerateResult } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export default function SpecGeneratorPage() {
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [result, setResult] = useState<SpecGenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (text.length < 10) {
      setError("최소 10자 이상 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await generateSpec(text, context || undefined);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 에러");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.markdown) return;
    await navigator.clipboard.writeText(result.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">NL → Spec Generator</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <label className="mb-1 block text-sm font-medium">
                요구사항 (자연어)
              </label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="예: 사용자가 에이전트별 토큰 사용량을 일별 차트로 확인할 수 있어야 합니다"
                rows={6}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                컨텍스트 (선택)
              </label>
              <Input
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="예: Sprint 8, Dashboard 페이지"
              />
            </div>

            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? "생성 중..." : "Spec 생성"}
            </Button>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        {/* Result */}
        {result && (
          <Card>
            <CardContent className="space-y-4 p-6">
              <h2 className="text-lg font-semibold">{result.spec.title}</h2>
              <p className="text-sm text-muted-foreground">
                {result.spec.description}
              </p>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Acceptance Criteria</h3>
                <ul className="list-inside list-disc text-sm">
                  {result.spec.acceptanceCriteria.map((ac, i) => (
                    <li key={i}>{ac}</li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-4 text-sm">
                <span className="rounded bg-muted px-2 py-1">
                  {result.spec.priority}
                </span>
                <span className="rounded bg-muted px-2 py-1">
                  {result.spec.estimatedEffort}
                </span>
                <span className="rounded bg-muted px-2 py-1">
                  {result.spec.category}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Model: {result.model} · Confidence: {(result.confidence * 100).toFixed(0)}%
                </span>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium">Markdown</h3>
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? "복사됨!" : "복사"}
                  </Button>
                </div>
                <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-xs">
                  {result.markdown}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
