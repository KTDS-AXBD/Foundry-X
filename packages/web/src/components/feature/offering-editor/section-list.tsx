/**
 * F376: Section List — 섹션 목록, 포함 토글, 순서 이동 (Sprint 170)
 */
import { ChevronUp, ChevronDown, Eye, EyeOff, Lock } from "lucide-react";
import type { OfferingSectionItem } from "@/lib/api-client";

interface SectionListProps {
  sections: OfferingSectionItem[];
  selectedId: string | null;
  onSelect: (section: OfferingSectionItem) => void;
  onToggleIncluded: (section: OfferingSectionItem) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

export function SectionList({
  sections,
  selectedId,
  onSelect,
  onToggleIncluded,
  onMoveUp,
  onMoveDown,
}: SectionListProps) {
  return (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-muted-foreground mb-2">
        섹션 ({sections.length})
      </h3>
      {sections.map((section, idx) => (
        <div
          key={section.id}
          className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
            selectedId === section.id
              ? "border-primary bg-primary/5"
              : "border-transparent hover:bg-muted/50"
          } ${!section.isIncluded ? "opacity-50" : ""}`}
          onClick={() => onSelect(section)}
        >
          <button
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onToggleIncluded(section);
            }}
            disabled={section.isRequired && section.isIncluded}
            title={section.isRequired ? "필수 섹션" : section.isIncluded ? "제외하기" : "포함하기"}
          >
            {section.isRequired ? (
              <Lock className="size-4" />
            ) : section.isIncluded ? (
              <Eye className="size-4" />
            ) : (
              <EyeOff className="size-4" />
            )}
          </button>
          <span className="flex-1 text-sm truncate">{section.title}</span>
          <div className="flex shrink-0 gap-0.5">
            <button
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              onClick={(e) => { e.stopPropagation(); onMoveUp(idx); }}
              disabled={idx === 0}
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              onClick={(e) => { e.stopPropagation(); onMoveDown(idx); }}
              disabled={idx === sections.length - 1}
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
