"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SpecConflict } from "@/lib/api-client";

interface ConflictCardProps {
  conflict: SpecConflict;
  index: number;
  resolved: boolean;
  onResolve: (resolution: "accept" | "reject" | "modify") => void;
}

const severityStyles: Record<string, string> = {
  critical: "border-l-4 border-l-destructive bg-destructive/5",
  warning: "border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
  info: "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
};

const typeLabels: Record<string, string> = {
  direct: "직접 충돌",
  dependency: "의존성 충돌",
  priority: "우선순위 충돌",
  scope: "범위 충돌",
};

export function ConflictCard({
  conflict,
  index,
  resolved,
  onResolve,
}: ConflictCardProps) {
  return (
    <Card className={severityStyles[conflict.severity] ?? ""}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Conflict #{index + 1} ({conflict.severity})
          </span>
          <span className="rounded bg-muted px-2 py-0.5 text-xs">
            {typeLabels[conflict.type] ?? conflict.type}
          </span>
        </div>

        <p className="text-sm">{conflict.description}</p>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-muted p-2">
            <span className="font-medium">기존: </span>
            {conflict.existingSpec.value}
          </div>
          <div className="rounded bg-muted p-2">
            <span className="font-medium">신규: </span>
            {conflict.newSpec.value}
          </div>
        </div>

        {conflict.suggestion && (
          <p className="text-xs text-muted-foreground">
            💡 {conflict.suggestion}
          </p>
        )}

        {resolved ? (
          <p className="text-xs font-medium text-green-600">✅ 해결됨</p>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onResolve("accept")}>
              수락
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onResolve("reject")}
            >
              거절
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onResolve("modify")}
            >
              수정
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
