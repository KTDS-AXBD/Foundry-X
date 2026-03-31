"use client";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, CATEGORY_COLORS, type BdSkill } from "@/data/bd-skills";
import { BD_STAGES } from "@/data/bd-process";

interface SkillDetailSheetProps {
  skill: BdSkill;
  onClose: () => void;
}

export default function SkillDetailSheet({ skill, onClose }: SkillDetailSheetProps) {
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[400px] overflow-y-auto sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base">{skill.name}</SheetTitle>
            <Badge
              variant="outline"
              className={cn("text-[10px]", CATEGORY_COLORS[skill.category])}
            >
              {CATEGORY_LABELS[skill.category]}
            </Badge>
          </div>
          <SheetDescription>{skill.description}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Type */}
          <div>
            <h4 className="mb-1 text-xs font-semibold text-muted-foreground">유형</h4>
            <Badge variant="outline" className="text-xs">
              {skill.type === "skill" ? "스킬" : "커맨드"}
            </Badge>
          </div>

          {/* ID */}
          <div>
            <h4 className="mb-1 text-xs font-semibold text-muted-foreground">ID</h4>
            <code className="rounded bg-muted px-2 py-1 text-xs">{skill.id}</code>
          </div>

          {/* Input */}
          {skill.input && (
            <div>
              <h4 className="mb-1 text-xs font-semibold text-muted-foreground">입력</h4>
              <p className="text-sm">{skill.input}</p>
            </div>
          )}

          {/* Output */}
          {skill.output && (
            <div>
              <h4 className="mb-1 text-xs font-semibold text-muted-foreground">산출물</h4>
              <p className="text-sm">{skill.output}</p>
            </div>
          )}

          {/* Recommended Stages */}
          <div>
            <h4 className="mb-2 text-xs font-semibold text-muted-foreground">추천 단계</h4>
            <div className="space-y-1.5">
              {skill.stages.map((stageId) => {
                const stage = BD_STAGES.find((s) => s.id === stageId);
                return (
                  <div
                    key={stageId}
                    className="flex items-center gap-2 rounded-md border px-3 py-1.5"
                  >
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {stageId}
                    </Badge>
                    <span className="text-xs">{stage?.name ?? stageId}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
