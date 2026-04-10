/**
 * F493: CardBlock — CardSchema 렌더러 (가독성 개선: 본문/subtitle 대비↑, spacing↑)
 */
import { MetricBlock } from "./MetricBlock.js";
import { TableBlock } from "./TableBlock.js";

interface Metric {
  value: string;
  label: string;
  color?: "default" | "mint" | "blue" | "amber" | "red" | "purple";
}

interface TableData {
  headers: string[];
  rows: Array<{ cells: string[]; highlight?: boolean }>;
  caption?: string;
}

interface Card {
  icon?: string;
  iconColor?: "mint" | "blue" | "amber" | "red" | "purple";
  title: string;
  subtitle?: string;
  body?: string;
  metrics?: Metric[];
  table?: TableData;
}

const ICON_BG_MAP: Record<string, string> = {
  mint: "var(--discovery-mint-bg)",
  blue: "var(--discovery-blue-bg)",
  amber: "var(--discovery-amber-bg)",
  red: "var(--discovery-red-bg)",
  purple: "var(--discovery-purple-bg)",
};

const ICON_COLOR_MAP: Record<string, string> = {
  mint: "var(--discovery-mint)",
  blue: "var(--discovery-blue)",
  amber: "var(--discovery-amber)",
  red: "var(--discovery-red)",
  purple: "var(--discovery-purple)",
};

interface CardBlockProps {
  card: Card;
}

export function CardBlock({ card }: CardBlockProps) {
  const iconBg = card.iconColor ? ICON_BG_MAP[card.iconColor] : undefined;
  const iconColor = card.iconColor ? ICON_COLOR_MAP[card.iconColor] : undefined;

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        {card.icon && (
          <span
            className="flex items-center justify-center w-10 h-10 rounded-md text-lg flex-shrink-0"
            style={{ backgroundColor: iconBg, color: iconColor }}
          >
            {card.icon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold leading-snug text-foreground">
            {card.title}
          </h3>
          {card.subtitle && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {card.subtitle}
            </p>
          )}
        </div>
      </div>

      {card.body && (
        <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-line">
          {card.body}
        </p>
      )}

      {card.metrics && card.metrics.length > 0 && <MetricBlock metrics={card.metrics} />}

      {card.table && <TableBlock table={card.table} />}
    </div>
  );
}
