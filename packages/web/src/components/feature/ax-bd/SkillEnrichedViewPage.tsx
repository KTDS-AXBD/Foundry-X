"use client";

import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSkillEnriched } from "@/hooks/useSkillRegistry";
import { API_CATEGORY_LABELS, API_CATEGORY_COLORS } from "@/data/bd-skills";
import SkillMetricsCards from "./SkillMetricsCards";
import SkillLineageTree from "./SkillLineageTree";
import SkillVersionHistory from "./SkillVersionHistory";

interface Props {
  skillId: string;
}

const SAFETY_COLORS: Record<string, string> = {
  A: "border-green-300 text-green-700",
  B: "border-blue-300 text-blue-700",
  C: "border-amber-300 text-amber-700",
  D: "border-red-300 text-red-700",
  F: "border-red-300 text-red-700",
};

export default function SkillEnrichedViewPage({ skillId }: Props) {
  const navigate = useNavigate();
  const { data: enriched, loading, error } = useSkillEnriched(skillId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">스킬 정보 로딩 중...</span>
      </div>
    );
  }

  if (error || !enriched) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <button
          type="button"
          onClick={() => navigate("/ax-bd/skill-catalog")}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 카탈로그로 돌아가기
        </button>
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {error ?? "스킬을 찾을 수 없어요."}
        </div>
      </div>
    );
  }

  const { registry, metrics, versions, lineage } = enriched;
  const categoryLabel = API_CATEGORY_LABELS[registry.category] ?? registry.category;
  const categoryColor = API_CATEGORY_COLORS[registry.category] ?? "";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Back link */}
      <button
        type="button"
        onClick={() => navigate("/ax-bd/skill-catalog")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 카탈로그로 돌아가기
      </button>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">{registry.name}</h1>
          <Badge variant="outline" className={cn("text-xs", categoryColor)}>
            {categoryLabel}
          </Badge>
          {registry.safetyGrade !== "pending" && (
            <Badge variant="outline" className={cn("text-xs", SAFETY_COLORS[registry.safetyGrade])}>
              <Shield className="mr-1 h-3 w-3" />
              {registry.safetyGrade}등급
            </Badge>
          )}
        </div>
        {registry.description && (
          <p className="text-sm text-muted-foreground">{registry.description}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {registry.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="font-mono text-[10px]">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          ID: <code className="rounded bg-muted px-1.5 py-0.5">{registry.skillId}</code>
          {" · "}소스: {registry.sourceType}
          {" · "}버전: v{registry.currentVersion}
        </div>
      </div>

      {/* Metrics */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">실행 메트릭</h2>
        <SkillMetricsCards metrics={metrics} />
      </section>

      {/* Lineage */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">진화 계보</h2>
        <SkillLineageTree lineage={lineage} currentSkillId={skillId} />
      </section>

      {/* Version History */}
      <section>
        <h2 className="mb-3 text-sm font-semibold">버전 이력</h2>
        <SkillVersionHistory versions={versions} />
      </section>
    </div>
  );
}
