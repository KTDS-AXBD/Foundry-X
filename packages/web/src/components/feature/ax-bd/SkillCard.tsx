"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  API_CATEGORY_LABELS,
  API_CATEGORY_COLORS,
  type BdSkill,
} from "@/data/bd-skills";
import type { SkillRegistryEntry } from "@foundry-x/shared";

type SkillItem =
  | { source: "api"; entry: SkillRegistryEntry }
  | { source: "local"; skill: BdSkill };

interface SkillCardProps {
  item: SkillItem;
  onClick: () => void;
}

export default function SkillCard({ item, onClick }: SkillCardProps) {
  const name = item.source === "api" ? item.entry.name : item.skill.name;
  const description = item.source === "api" ? (item.entry.description ?? "") : item.skill.description;
  const tags = item.source === "api" ? item.entry.tags : item.skill.stages;

  const categoryLabel = item.source === "api"
    ? API_CATEGORY_LABELS[item.entry.category]
    : CATEGORY_LABELS[item.skill.category];
  const categoryColor = item.source === "api"
    ? API_CATEGORY_COLORS[item.entry.category]
    : CATEGORY_COLORS[item.skill.category];

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-2 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-tight">{name}</h3>
        <Badge
          variant="outline"
          className={cn("shrink-0 text-[10px]", categoryColor)}
        >
          {categoryLabel}
        </Badge>
      </div>

      <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>

      <div className="flex flex-wrap gap-1">
        {tags.slice(0, 4).map((s) => (
          <Badge key={s} variant="outline" className="font-mono text-[10px]">
            {s}
          </Badge>
        ))}
        {tags.length > 4 && (
          <Badge variant="outline" className="text-[10px]">
            +{tags.length - 4}
          </Badge>
        )}
      </div>
    </button>
  );
}
