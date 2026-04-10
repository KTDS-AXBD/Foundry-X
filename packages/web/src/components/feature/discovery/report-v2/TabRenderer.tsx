/**
 * F493: TabRenderer — TabSchema → JSX 범용 렌더러
 * 카드는 기본 1열 (md 이상부터 2열) → 테이블/메트릭 가독성 확보
 */
import { lazy, Suspense } from "react";
import { Badge } from "@/components/ui/badge.js";
import { CardBlock } from "./blocks/CardBlock.js";
import { InsightBox } from "./blocks/InsightBox.js";
import { NextStepBox } from "./blocks/NextStepBox.js";

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

  // 카드가 테이블을 포함하면 1열로만 렌더 (테이블 가독성 확보)
  const hasAnyTable = (tab.cards as Array<{ table?: unknown }> | undefined)?.some(
    (c) => c && typeof c === "object" && "table" in c && !!c.table,
  );

  return (
    <div className="space-y-6 p-1" data-step={stepKey}>
      {/* 헤더 */}
      <div
        className="flex items-start justify-between gap-3 border-b pb-4"
        style={{ borderColor: `color-mix(in srgb, ${stepColor} 40%, transparent)` }}
      >
        <div className="flex items-start gap-3 min-w-0">
          <span
            className="flex items-center justify-center min-w-[2.5rem] h-9 rounded-full text-white text-xs font-bold px-2.5 flex-shrink-0"
            style={{ backgroundColor: stepColor }}
          >
            {tab.stepNumber.replace("STEP ", "")}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground leading-snug">
              {tab.title}
            </h2>
            {tab.engTitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{tab.engTitle}</p>
            )}
            {tab.subtitle && (
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {tab.subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {tab.hitlVerified && (
            <Badge className="bg-green-100 text-green-800 text-[11px] h-6 px-2">
              ✓ HITL 검증
            </Badge>
          )}
        </div>
      </div>

      {/* 태그 */}
      {tab.tags && tab.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tab.tags.map((tag, i) => (
            <span
              key={i}
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${TAG_CLASS_MAP[tag.color] ?? ""}`}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* 카드 그리드 — 테이블 포함 시 1열, 아니면 lg:2열 */}
      {tab.cards.length > 0 && (
        <div className={`grid gap-4 ${hasAnyTable ? "grid-cols-1" : "lg:grid-cols-2"}`}>
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
      {tab.insight && <InsightBox title={tab.insight.title} items={tab.insight.items} />}

      {/* 다음 단계 */}
      {tab.nextStep && <NextStepBox text={tab.nextStep.text} />}
    </div>
  );
}
