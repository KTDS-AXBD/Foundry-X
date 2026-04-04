"use client";

import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Shield, BookOpen, Terminal, Sparkles } from "lucide-react";
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
        <div className="text-xs text-muted-foreground">
          ID: <code className="rounded bg-muted px-1.5 py-0.5">{registry.skillId}</code>
          {" · "}v{registry.currentVersion}
        </div>
      </div>

      {/* Skill Overview */}
      <section className="space-y-4 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">스킬 소개</h2>
        </div>

        {registry.description && (
          <div>
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">설명</h3>
            <p className="text-sm leading-relaxed">{registry.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">카테고리</h3>
            <Badge variant="outline" className={cn("text-xs", categoryColor)}>
              {categoryLabel}
            </Badge>
          </div>
          <div>
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">소스 타입</h3>
            <div className="flex items-center gap-1">
              {registry.sourceType === "derived" || registry.sourceType === "captured" ? (
                <Sparkles className="h-3 w-3 text-amber-500" />
              ) : (
                <Terminal className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="capitalize">{registry.sourceType}</span>
            </div>
          </div>
          <div>
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">모델</h3>
            <span>{registry.modelPreference ?? "기본 모델"}</span>
          </div>
          <div>
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">최대 토큰</h3>
            <span>{registry.maxTokens.toLocaleString()}</span>
          </div>
        </div>

        {registry.tags.length > 0 && (
          <div>
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">태그</h3>
            <div className="flex flex-wrap gap-1">
              {registry.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {registry.sourceType === "marketplace" && (
          <div className="rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <strong>사용법:</strong> Claude Code에서 <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">/ax:{registry.skillId}</code> 명령으로 실행하거나,
            BD Hub 발굴 프로세스에서 자동으로 호출돼요.
          </div>
        )}

        {(registry.sourceType === "derived" || registry.sourceType === "captured") && (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <strong>AI 생성 스킬:</strong> 이 스킬은 {registry.sourceType === "derived" ? "패턴 분석" : "워크플로우 캡처"}을 통해
            자동 생성됐어요. SKILL.md가 생성되면 CC에서 바로 실행할 수 있어요.
          </div>
        )}
      </section>

      {/* Prompt Template */}
      {registry.promptTemplate && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">프롬프트 템플릿</h2>
          <div className="rounded-lg border bg-muted/30 p-4">
            <pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">
              {registry.promptTemplate}
            </pre>
          </div>
        </section>
      )}

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
