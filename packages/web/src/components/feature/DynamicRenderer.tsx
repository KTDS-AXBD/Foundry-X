"use client";

import { useState } from "react";
import type { UIHint } from "@/lib/api-client";
import { SectionRenderer } from "./SectionRenderer";
import { WidgetRenderer } from "./WidgetRenderer";

interface DynamicRendererProps {
  uiHint: UIHint;
  onAction?: (action: string, data: unknown) => void;
}

export function DynamicRenderer({ uiHint, onAction }: DynamicRendererProps) {
  // iframe 모드: html 필드가 있으면 WidgetRenderer로 렌더링
  if (uiHint.layout === "iframe" && uiHint.html) {
    return (
      <WidgetRenderer
        title={uiHint.sections[0]?.title ?? "Visualization"}
        description={uiHint.sections[0]?.data ? String(uiHint.sections[0].data).slice(0, 100) : undefined}
        html={uiHint.html}
        onAction={onAction}
      />
    );
  }

  // tabs 모드: 2개 이상 섹션이면 탭 UI (shadcn Tabs가 없으므로 간단한 탭 구현)
  if (uiHint.layout === "tabs" && uiHint.sections.length > 1) {
    return <TabsLayout sections={uiHint.sections} />;
  }

  // accordion 모드: 접힘/펼침
  if (uiHint.layout === "accordion") {
    return <AccordionLayout sections={uiHint.sections} />;
  }

  // card/flow 기본 모드: 섹션 순차 렌더링
  return (
    <div className="space-y-4">
      {uiHint.sections.map((s, i) => (
        <SectionRenderer key={i} section={s} />
      ))}
    </div>
  );
}

// 간단한 탭 구현 (shadcn Tabs 미설치 시 대응)
function TabsLayout({ sections }: { sections: UIHint["sections"] }) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div className="flex border-b">
        {sections.map((s, i) => (
          <button
            key={i}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              i === activeTab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab(i)}
          >
            {s.title}
          </button>
        ))}
      </div>
      <div className="pt-3">
        <SectionRenderer section={sections[activeTab]} />
      </div>
    </div>
  );
}

function AccordionLayout({ sections }: { sections: UIHint["sections"] }) {
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set([0]));

  const toggle = (index: number) => {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="divide-y rounded border">
      {sections.map((s, i) => (
        <div key={i}>
          <button
            className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium hover:bg-muted/50"
            onClick={() => toggle(i)}
          >
            {s.title}
            <span className="text-muted-foreground">
              {openIndices.has(i) ? "▼" : "▶"}
            </span>
          </button>
          {openIndices.has(i) && (
            <div className="px-3 pb-3">
              <SectionRenderer section={s} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

