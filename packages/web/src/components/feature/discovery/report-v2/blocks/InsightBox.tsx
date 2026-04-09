/**
 * F493: InsightBox — InsightBoxSchema 렌더러 (v2 전용)
 */
import { Lightbulb } from "lucide-react";

interface InsightBoxProps {
  title: string;
  items: string[];
}

export function InsightBox({ title, items }: InsightBoxProps) {
  return (
    <div
      className="rounded-lg border bg-card p-4"
      style={{ borderLeftWidth: 3, borderLeftColor: "var(--discovery-purple)" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="size-4 text-amber-500" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-muted-foreground flex gap-2">
            <span className="text-amber-500 flex-shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
