"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, CATEGORY_COLORS, type BdSkill } from "@/data/bd-skills";

interface SkillCardProps {
  skill: BdSkill;
  onClick: () => void;
}

export default function SkillCard({ skill, onClick }: SkillCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-2 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/50"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium leading-tight">{skill.name}</h3>
        <Badge
          variant="outline"
          className={cn("shrink-0 text-[10px]", CATEGORY_COLORS[skill.category])}
        >
          {CATEGORY_LABELS[skill.category]}
        </Badge>
      </div>

      <p className="line-clamp-2 text-xs text-muted-foreground">{skill.description}</p>

      <div className="flex flex-wrap gap-1">
        {skill.stages.slice(0, 4).map((s) => (
          <Badge key={s} variant="outline" className="font-mono text-[10px]">
            {s}
          </Badge>
        ))}
        {skill.stages.length > 4 && (
          <Badge variant="outline" className="text-[10px]">
            +{skill.stages.length - 4}
          </Badge>
        )}
      </div>
    </button>
  );
}
