"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  generateTests,
  analyzeCoverageGaps,
  type TestGenerationResponse,
  type CoverageGapResponse,
} from "@/lib/api-client";
import { TestGenerationResult } from "./TestGenerationResult";
import { CoverageGapView } from "./CoverageGapView";

interface TestAgentPanelProps {
  onClose: () => void;
}

type PanelTab = "generate" | "coverage";

export function TestAgentPanel({ onClose }: TestAgentPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("generate");
  const [sourceCode, setSourceCode] = useState("");
  const [instructions, setInstructions] = useState("");
  const [testCode, setTestCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateResult, setGenerateResult] = useState<TestGenerationResponse | null>(null);
  const [coverageResult, setCoverageResult] = useState<CoverageGapResponse | null>(null);

  const handleGenerate = async () => {
    if (!sourceCode.trim()) {
      setError("소스 코드를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    setGenerateResult(null);
    try {
      const result = await generateTests(sourceCode, {
        instructions: instructions || undefined,
      });
      setGenerateResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "테스트 생성 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleCoverageAnalysis = async () => {
    if (!sourceCode.trim()) {
      setError("소스 코드를 입력해주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    setCoverageResult(null);
    try {
      const result = await analyzeCoverageGaps(
        sourceCode,
        testCode || undefined,
      );
      setCoverageResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "커버리지 분석 실패");
    } finally {
      setLoading(false);
    }
  };

  const tabs: { key: PanelTab; label: string }[] = [
    { key: "generate", label: "테스트 생성" },
    { key: "coverage", label: "커버리지 갭" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">TestAgent</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          닫기
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setError(null);
            }}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Source code input (shared between tabs) */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium">소스 코드</label>
            <Textarea
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              placeholder="테스트를 생성할 TypeScript 소스 코드를 붙여넣으세요..."
              rows={10}
              className="font-mono text-xs"
            />
          </div>

          {/* Generate tab: instructions + button */}
          {activeTab === "generate" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  추가 지시사항 (선택)
                </label>
                <Textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="예: 에러 핸들링 케이스를 중점적으로 테스트해주세요"
                  rows={2}
                />
              </div>
              <Button onClick={handleGenerate} disabled={loading}>
                {loading ? "생성 중..." : "테스트 생성"}
              </Button>
            </>
          )}

          {/* Coverage tab: test code + button */}
          {activeTab === "coverage" && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  기존 테스트 코드 (선택)
                </label>
                <Textarea
                  value={testCode}
                  onChange={(e) => setTestCode(e.target.value)}
                  placeholder="기존 테스트 코드가 있으면 붙여넣으세요 (없으면 비워두세요)"
                  rows={6}
                  className="font-mono text-xs"
                />
              </div>
              <Button onClick={handleCoverageAnalysis} disabled={loading}>
                {loading ? "분석 중..." : "갭 분석"}
              </Button>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* Results */}
      {activeTab === "generate" && generateResult && (
        <TestGenerationResult result={generateResult} />
      )}
      {activeTab === "coverage" && coverageResult && (
        <CoverageGapView result={coverageResult} />
      )}
    </div>
  );
}
