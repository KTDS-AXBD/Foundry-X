/**
 * F493: TabRenderer — TabSchema → JSX 범용 렌더러
 * 탭별 React 컴포넌트 9개 대신 이 단일 컴포넌트가 모든 탭을 처리한다
 */
import { lazy, Suspense } from "react";
import { Badge } from "@/components/ui/badge.js";
import { CardBlock } from "./blocks/CardBlock.js";
import { InsightBox } from "./blocks/InsightBox.js";
import { NextStepBox } from "./blocks/NextStepBox.js";

// ChartBlock은 lazy 로드
const ChartBlock = lazy(() =>
  import("./blocks/ChartBlock.js").then((m) => ({ default: m.ChartBlock })),
);

const COLOR_MAP: Record<string, string> = {
  mint: "var(--discovery-mint)",
  blue: "var(--discovery-blue)",
  amber: "var(--discovery-amber)",
  red: "var(--discovery-red)",
  purple: "var(--discovery-purple)",
};

const TAG_CLASS_MAP: Record<string, string> = {
  mint: "bg-[var(--discovery-mint-bg)] text-[var(--discovery-mint)]",
  blue: "bg-[var(--discovery-blue-bg)] text-[var(--discovery-blue)]",
  amber: "bg-[var(--discovery-amber-bg)] text-[var(--discovery-amber)]",
  red: "bg-[var(--discovery-red-bg)] text-[var(--discovery-red)]",
  purple: "bg-[var(--discovery-purple-bg)] text-[var(--discovery-purple)]",
};

interface Tag {
  label: string;
  color: "mint" | "blue" | "amber" | "red" | "purple";
}

interface TabData {
  stepNumber: string;
  title: string;
  engTitle?: string;
  subtitle?: string;
  hitlVerified: boolean;
  tags?: Tag[];
  cards: unknown[];
  chart?: unknown;
  insight?: { title: string; items: string[] };
  nextStep?: { text: string };
}

interface TabRendererProps {
  stepKey: string;
  tab: TabData;
}

export function TabRenderer({ stepKey, tab }: TabRendererProps) {
  const stepColor =
    COLOR_MAP[
      ["2-1", "2-2"].includes(stepKey)
        ? "mint"
        : ["2-3", "2-4"].includes(stepKey)
          ? "blue"
          : ["2-5", "2-6", "2-7"].includes(stepKey)
            ? "amber"
            : stepKey === "2-8"
              ? "red"
              : "purple"
    ] ?? "var(--foreground)";

  return (
    <div className="space-y-5 p-1" data-step={stepKey}>
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3 border-b pb-3" style={{ borderColor: stepColor }}>
        <div className="flex items-start gap-3">
          <span
            className="flex items-center justify-center min-w-[2rem] h-8 rounded-full text-white text-xs font-bold px-2"
            style={{ backgroundColor: stepColor }}
          >
            {tab.stepNumber.replace("STEP ", "")}
          </span>
          <div>
            <h2 className="text-base font-semibold leading-snug">{tab.title}</h2>
            {tab.engTitle && (
              <p className="text-xs text-muted-foreground">{tab.engTitle}</p>
            )}
            {tab.subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 italic">{tab.subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {tab.hitlVerified && (
            <Badge className="bg-mint-100 text-mint-800 text-[10px]">✓ HITL 검증</Badge>
          )}
        </div>
      </div>

      {/* 태그 */}
      {tab.tags && tab.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tab.tags.map((tag, i) => (
            <span
              key={i}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TAG_CLASS_MAP[tag.color] ?? ""}`}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* 카드 그리드 */}
      {tab.cards.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {(tab.cards as Parameters<typeof CardBlock>[0]["card"][]).map((card, i) => (
            <CardBlock key={i} card={card as Parameters<typeof CardBlock>[0]["card"]} />
          ))}
        </div>
      )}

      {/* 차트 */}
      {!!tab.chart && (
        <Suspense
          fallback={
            <div className="h-48 rounded-lg bg-muted/30 animate-pulse flex items-center justify-center">
              <span className="text-xs text-muted-foreground">차트 로딩 중...</span>
            </div>
          }
        >
          <ChartBlock chart={tab.chart as Parameters<typeof ChartBlock>[0]["chart"]} />
        </Suspense>
      )}

      {/* 인사이트 박스 */}
      {tab.insight && (
        <InsightBox title={tab.insight.title} items={tab.insight.items} />
      )}

      {/* 다음 단계 */}
      {tab.nextStep && <NextStepBox text={tab.nextStep.text} />}
    </div>
  );
}
