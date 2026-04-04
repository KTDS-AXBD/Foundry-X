"use client";

import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  API_CATEGORY_LABELS,
  API_CATEGORY_COLORS,
  type BdSkill,
} from "@/data/bd-skills";
import { BD_STAGES } from "@/data/bd-process";
import { useSkillEnriched } from "@/hooks/useSkillRegistry";
import SkillExecutionForm from "./SkillExecutionForm";
import type { SkillRegistryEntry } from "@foundry-x/shared";

type SkillItem =
  | { source: "api"; entry: SkillRegistryEntry }
  | { source: "local"; skill: BdSkill };

interface SkillDetailSheetProps {
  item: SkillItem;
  onClose: () => void;
  bizItemId?: string;
  stageId?: string;
}

export default function SkillDetailSheet({ item, onClose, bizItemId, stageId }: SkillDetailSheetProps) {
  const skillId = item.source === "api" ? item.entry.skillId : null;
  const { data: enriched, loading: enrichedLoading } = useSkillEnriched(skillId);

  const name = item.source === "api" ? item.entry.name : item.skill.name;
  const description = item.source === "api" ? (item.entry.description ?? "") : item.skill.description;
  const categoryLabel = item.source === "api"
    ? API_CATEGORY_LABELS[item.entry.category]
    : CATEGORY_LABELS[item.skill.category];
  const categoryColor = item.source === "api"
    ? API_CATEGORY_COLORS[item.entry.category]
    : CATEGORY_COLORS[item.skill.category];
  const tags = item.source === "api" ? item.entry.tags : item.skill.stages;
  const id = item.source === "api" ? item.entry.skillId : item.skill.id;

  // For local skills, use BdSkill-specific fields
  const localSkill = item.source === "local" ? item.skill : null;

  // Source type display
  const sourceLabel = item.source === "api"
    ? item.entry.sourceType === "marketplace" ? "마켓플레이스" : item.entry.sourceType
    : item.skill.type === "skill" ? "스킬" : "커맨드";

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[400px] overflow-y-auto sm:w-[540px]">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base">{name}</SheetTitle>
            <Badge
              variant="outline"
              className={cn("text-[10px]", categoryColor)}
            >
              {categoryLabel}
            </Badge>
          </div>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Type / Source */}
          <div>
            <h4 className="mb-1 text-xs font-semibold text-muted-foreground">유형</h4>
            <Badge variant="outline" className="text-xs">
              {sourceLabel}
            </Badge>
          </div>

          {/* ID */}
          <div>
            <h4 className="mb-1 text-xs font-semibold text-muted-foreground">ID</h4>
            <code className="rounded bg-muted px-2 py-1 text-xs">{id}</code>
          </div>

          {/* Input (local only) */}
          {localSkill?.input && (
            <div>
              <h4 className="mb-1 text-xs font-semibold text-muted-foreground">입력</h4>
              <p className="text-sm">{localSkill.input}</p>
            </div>
          )}

          {/* Output (local only) */}
          {localSkill?.output && (
            <div>
              <h4 className="mb-1 text-xs font-semibold text-muted-foreground">산출물</h4>
              <p className="text-sm">{localSkill.output}</p>
            </div>
          )}

          {/* Tags / Stages */}
          <div>
            <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
              {item.source === "api" ? "태그" : "추천 단계"}
            </h4>
            <div className="space-y-1.5">
              {tags.map((sid) => {
                const stage = BD_STAGES.find((s) => s.id === sid);
                return (
                  <div
                    key={sid}
                    className="flex items-center gap-2 rounded-md border px-3 py-1.5"
                  >
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {sid}
                    </Badge>
                    {stage && <span className="text-xs">{stage.name}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enriched Metrics (API only) */}
          {item.source === "api" && (
            <div>
              <h4 className="mb-2 text-xs font-semibold text-muted-foreground">메트릭</h4>
              {enrichedLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" /> 로딩 중...
                </div>
              ) : enriched?.metrics ? (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md border p-2 text-center">
                    <div className="text-lg font-semibold">{enriched.metrics.totalExecutions}</div>
                    <div className="text-[10px] text-muted-foreground">실행 횟수</div>
                  </div>
                  <div className="rounded-md border p-2 text-center">
                    <div className="text-lg font-semibold">
                      {(enriched.metrics.successRate * 100).toFixed(0)}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">성공률</div>
                  </div>
                  <div className="rounded-md border p-2 text-center">
                    <div className="text-lg font-semibold">
                      ${enriched.metrics.totalCostUsd.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">총 비용</div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">메트릭 데이터 없음</p>
              )}
            </div>
          )}

          {/* Safety Grade (API only) */}
          {item.source === "api" && item.entry.safetyGrade !== "pending" && (
            <div>
              <h4 className="mb-1 text-xs font-semibold text-muted-foreground">안전 등급</h4>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  item.entry.safetyGrade === "A" && "border-green-300 text-green-700",
                  item.entry.safetyGrade === "B" && "border-blue-300 text-blue-700",
                  item.entry.safetyGrade === "C" && "border-amber-300 text-amber-700",
                  (item.entry.safetyGrade === "D" || item.entry.safetyGrade === "F") && "border-red-300 text-red-700",
                )}
              >
                등급 {item.entry.safetyGrade} ({item.entry.safetyScore}점)
              </Badge>
            </div>
          )}

          {/* Execution (F260) — only when bizItemId is provided, local skills only */}
          {bizItemId && localSkill && localSkill.type === "skill" && (
            <SkillExecutionForm
              skill={localSkill}
              bizItemId={bizItemId}
              stageId={stageId ?? localSkill.stages[0] ?? "2-0"}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
