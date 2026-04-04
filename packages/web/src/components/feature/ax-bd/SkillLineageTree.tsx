import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SkillLineageNode } from "@foundry-x/shared";

interface Props {
  lineage: SkillLineageNode | null;
  currentSkillId: string;
}

const TYPE_COLORS: Record<string, string> = {
  manual: "border-blue-300 text-blue-700",
  derived: "border-purple-300 text-purple-700",
  captured: "border-green-300 text-green-700",
  forked: "border-amber-300 text-amber-700",
};

function NodeCard({
  skillId,
  derivationType,
  isCurrent,
  onClick,
}: {
  skillId: string;
  derivationType: string;
  isCurrent: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border px-3 py-2 text-xs transition-colors hover:bg-muted/50",
        isCurrent && "border-primary bg-primary/5 ring-1 ring-primary",
      )}
    >
      <span className="font-mono font-medium">{skillId}</span>
      <Badge variant="outline" className={cn("text-[10px]", TYPE_COLORS[derivationType])}>
        {derivationType}
      </Badge>
    </button>
  );
}

export default function SkillLineageTree({ lineage, currentSkillId }: Props) {
  const navigate = useNavigate();

  if (!lineage) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        파생 관계가 없어요.
      </div>
    );
  }

  const parents = lineage.parents ?? [];
  const children = lineage.children ?? [];
  const goTo = (id: string) => navigate(`/ax-bd/skill-catalog/${id}`);

  return (
    <div className="flex items-center justify-center gap-4 overflow-x-auto py-4">
      {/* Parents */}
      {parents.length > 0 && (
        <div className="flex flex-col gap-2">
          {parents.map((p) => (
            <NodeCard
              key={p.skillId}
              skillId={p.skillId}
              derivationType={p.derivationType}
              isCurrent={false}
              onClick={() => goTo(p.skillId)}
            />
          ))}
        </div>
      )}

      {/* Arrow from parents */}
      {parents.length > 0 && (
        <span className="text-muted-foreground">→</span>
      )}

      {/* Current */}
      <NodeCard
        skillId={currentSkillId}
        derivationType={lineage.derivationType}
        isCurrent
        onClick={() => {}}
      />

      {/* Arrow to children */}
      {children.length > 0 && (
        <span className="text-muted-foreground">→</span>
      )}

      {/* Children */}
      {children.length > 0 && (
        <div className="flex flex-col gap-2">
          {children.map((c) => (
            <NodeCard
              key={c.skillId}
              skillId={c.skillId}
              derivationType={c.derivationType}
              isCurrent={false}
              onClick={() => goTo(c.skillId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
