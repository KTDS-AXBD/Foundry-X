"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OutputJsonViewerProps {
  stageNum: string;
  outputJson: unknown;
  className?: string;
}

interface JsonSection {
  key: string;
  label: string;
  value: unknown;
}

function extractSections(data: unknown): JsonSection[] {
  if (!data || typeof data !== "object") return [];

  const obj = data as Record<string, unknown>;
  const sections: JsonSection[] = [];

  const labelMap: Record<string, string> = {
    title: "제목",
    summary: "요약",
    items: "항목",
    analysis: "분석",
    recommendations: "권장사항",
    references: "레퍼런스",
    market_size: "시장 규모",
    tam: "TAM",
    sam: "SAM",
    som: "SOM",
    competitors: "경쟁사",
    strengths: "강점",
    weaknesses: "약점",
    opportunities: "기회",
    threats: "위협",
    pain_points: "Pain Points",
    segments: "세그먼트",
    persona: "페르소나",
    business_model: "비즈니스 모델",
    revenue: "수익 모델",
    score: "점수",
    verdict: "판정",
  };

  for (const [key, value] of Object.entries(obj)) {
    sections.push({
      key,
      label: labelMap[key] ?? key,
      value,
    });
  }

  return sections;
}

function RenderValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">없음</span>;
  }

  if (typeof value === "string") {
    return <p className="text-sm whitespace-pre-wrap">{value}</p>;
  }

  if (typeof value === "number") {
    return <span className="text-sm font-mono font-bold">{value}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground italic">빈 목록</span>;
    if (typeof value[0] === "string") {
      return (
        <ul className="list-disc list-inside text-sm space-y-0.5">
          {value.map((item, i) => (
            <li key={i}>{String(item)}</li>
          ))}
        </ul>
      );
    }
    return (
      <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  if (typeof value === "object") {
    return (
      <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-auto">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  return <span className="text-sm">{String(value)}</span>;
}

export default function OutputJsonViewer({ stageNum, outputJson, className }: OutputJsonViewerProps) {
  const [rawMode, setRawMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const sections = extractSections(outputJson);
  const hasStructure = sections.length > 0;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(outputJson, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      <div className="flex items-center justify-between p-3 border-b">
        <h4 className="text-sm font-medium">
          Step {stageNum} 결과
        </h4>
        <div className="flex gap-1">
          {hasStructure && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setRawMode(!rawMode)}
            >
              {rawMode ? "구조화" : "원본 JSON"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "복사됨" : "복사"}
          </Button>
        </div>
      </div>

      <div className="p-3">
        {!hasStructure || rawMode ? (
          <pre className="text-xs bg-muted/50 p-3 rounded overflow-x-auto max-h-96">
            {JSON.stringify(outputJson, null, 2)}
          </pre>
        ) : (
          <div className="space-y-3">
            {sections.map((section) => (
              <CollapsibleSection key={section.key} section={section} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CollapsibleSection({ section }: { section: JsonSection }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border rounded-lg">
      <button
        className="flex items-center gap-2 w-full p-2 text-left hover:bg-muted/50 rounded-t-lg"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {section.label}
        </span>
      </button>
      {open && (
        <div className="p-2 border-t">
          <RenderValue value={section.value} />
        </div>
      )}
    </div>
  );
}
