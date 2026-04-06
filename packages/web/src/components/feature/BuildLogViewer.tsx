// F356: 빌드로그 뷰어 — 단계별 펼침/접기 (Sprint 160)

import { useState } from "react";

interface BuildLogViewerProps {
  log: string;
}

interface LogSection {
  title: string;
  content: string;
  isError: boolean;
}

function parseSections(log: string): LogSection[] {
  if (!log) return [];

  const lines = log.split("\n");
  const sections: LogSection[] = [];
  let currentTitle = "Build Output";
  let currentLines: string[] = [];

  for (const line of lines) {
    // Detect section headers like "--- Step: Generate ---" or "[Phase] ..."
    const headerMatch = line.match(/^(?:---\s*(.+?)\s*---|^\[(.+?)\])/);
    if (headerMatch) {
      if (currentLines.length > 0) {
        sections.push({
          title: currentTitle,
          content: currentLines.join("\n"),
          isError: currentLines.some((l) => /error|fail|exception/i.test(l)),
        });
      }
      currentTitle = headerMatch[1] || headerMatch[2] || "Section";
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    sections.push({
      title: currentTitle,
      content: currentLines.join("\n"),
      isError: currentLines.some((l) => /error|fail|exception/i.test(l)),
    });
  }

  return sections;
}

export default function BuildLogViewer({ log }: BuildLogViewerProps) {
  const sections = parseSections(log);
  const [expanded, setExpanded] = useState<Set<number>>(
    new Set(sections.map((s, i) => (s.isError ? i : -1)).filter((i) => i >= 0)),
  );

  if (!log) {
    return (
      <div className="text-sm text-muted-foreground italic p-4">
        빌드 로그가 없어요.
      </div>
    );
  }

  const toggle = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="space-y-1">
      {sections.map((section, idx) => (
        <div
          key={idx}
          className={`border rounded text-sm ${section.isError ? "border-red-300 bg-red-50/50" : "border-border"}`}
        >
          <button
            className="w-full text-left px-3 py-2 font-medium flex items-center gap-2 hover:bg-muted/50"
            onClick={() => toggle(idx)}
          >
            <span className="text-xs">{expanded.has(idx) ? "▼" : "▶"}</span>
            <span>{section.title}</span>
            {section.isError && (
              <span className="text-xs text-red-600 ml-auto">Error</span>
            )}
          </button>
          {expanded.has(idx) && (
            <pre className="px-3 pb-2 text-xs overflow-x-auto whitespace-pre-wrap text-muted-foreground">
              {section.content}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
