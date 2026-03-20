"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProjectInfo } from "@/lib/api-client";

const gradeColor = (grade: string) => {
  switch (grade) {
    case "A": return "text-green-500 bg-green-500/10 border-green-500/30";
    case "B": return "text-blue-500 bg-blue-500/10 border-blue-500/30";
    case "C": return "text-yellow-500 bg-yellow-500/10 border-yellow-500/30";
    default:  return "text-red-500 bg-red-500/10 border-red-500/30";
  }
};

export default function ProjectCard({ project }: { project: ProjectInfo }) {
  return (
    <Card className="cursor-pointer transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">{project.name}</h3>
          <span className={cn("rounded-full border px-2 py-0.5 text-xs font-bold", gradeColor(project.grade))}>
            {project.grade}
          </span>
        </div>

        <div className="mb-3">
          <div className="mb-1 flex items-baseline gap-1">
            <span className={cn("text-3xl font-bold", gradeColor(project.grade).split(" ")[0])}>
              {project.healthScore}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className={cn("h-2 rounded-full", {
                "bg-green-500": project.grade === "A",
                "bg-blue-500": project.grade === "B",
                "bg-yellow-500": project.grade === "C",
                "bg-red-500": project.grade === "D",
              })}
              style={{ width: `${project.healthScore}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div>
            Agents <strong className="text-foreground">{project.activeAgents}</strong>
          </div>
          <div>
            Tasks <strong className="text-foreground">{project.openTasks}</strong>
          </div>
          <div>
            PRs <strong className="text-foreground">{project.recentPrCount}</strong>
          </div>
          <div className="truncate text-xs">
            {new Date(project.lastActivity).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
