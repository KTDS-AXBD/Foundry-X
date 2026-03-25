"use client";

import { cn } from "@/lib/utils";

const PRESET_TAGS = [
  "AI", "SaaS", "B2B", "B2C", "플랫폼", "데이터", "자동화", "헬스케어", "핀테크", "교육",
];

interface TagFilterProps {
  selected?: string;
  onSelect: (tag: string | undefined) => void;
}

export default function TagFilter({ selected, onSelect }: TagFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onSelect(undefined)}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-medium transition-colors",
          !selected
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        )}
      >
        전체
      </button>
      {PRESET_TAGS.map((tag) => (
        <button
          key={tag}
          onClick={() => onSelect(selected === tag ? undefined : tag)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            selected === tag
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          )}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}
