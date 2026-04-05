/**
 * Sprint 156: F346 — AI 인사이트 카드
 * 접기/펼치기 가능한 인사이트 박스
 */
import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react";

interface InsightBoxProps {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function InsightBox({
  title,
  children,
  icon,
  collapsible = true,
  defaultOpen = true,
}: InsightBoxProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border bg-card p-4" style={{ borderLeftWidth: 3, borderLeftColor: "var(--discovery-purple)" }}>
      <button
        className="flex w-full items-center justify-between text-left"
        onClick={() => collapsible && setOpen(!open)}
        type="button"
      >
        <div className="flex items-center gap-2">
          {icon ?? <Lightbulb className="size-4 text-amber-500" />}
          <span className="text-sm font-semibold">{title}</span>
        </div>
        {collapsible && (open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />)}
      </button>
      {open && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}
