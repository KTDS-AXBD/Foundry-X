"use client";

import { useState, useMemo } from "react";
import { Search, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface SkillGuideData {
  orchestrator: {
    name: string;
    description: string;
    commands: Array<{ command: string; description: string }>;
    stages: Array<{ id: string; name: string; description: string }>;
  };
  skills: Array<{
    name: string;
    displayName: string;
    description: string;
    category: string;
    triggers: string[];
    frameworks: string[];
  }>;
}

const CATEGORIES = ["전체", "분석", "전략", "실행", "규제", "보고"] as const;

const categoryColors: Record<string, string> = {
  분석: "bg-blue-100 text-blue-700",
  전략: "bg-violet-100 text-violet-700",
  실행: "bg-green-100 text-green-700",
  규제: "bg-orange-100 text-orange-700",
  보고: "bg-gray-100 text-gray-700",
};

export default function SkillReferenceTable({ data }: { data: SkillGuideData | null }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("전체");

  const filteredSkills = useMemo(() => {
    if (!data) return [];
    return data.skills.filter((skill) => {
      const matchesSearch =
        !search ||
        skill.displayName.toLowerCase().includes(search.toLowerCase()) ||
        skill.description.toLowerCase().includes(search.toLowerCase()) ||
        skill.triggers.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = category === "전체" || skill.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [data, search, category]);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        스킬 데이터를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold font-display mb-1">스킬 레퍼런스</h2>
        <p className="text-sm text-muted-foreground mb-4">
          AX BD Discovery 프로세스에서 사용하는 스킬 목록이에요.
        </p>
      </div>

      {/* Search + Category Filter */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="스킬 이름, 설명, 트리거로 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? "default" : "outline"}
              size="xs"
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Skill Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredSkills.map((skill) => (
          <Card key={skill.name} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm">{skill.displayName}</CardTitle>
                <Badge
                  className={cn(
                    "shrink-0 text-[0.65rem]",
                    categoryColors[skill.category] ?? "bg-gray-100 text-gray-700",
                  )}
                >
                  {skill.category}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{skill.description}</p>
            </CardHeader>
            <CardContent className="mt-auto pt-0">
              {skill.triggers.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {skill.triggers.map((trigger) => (
                    <span
                      key={trigger}
                      className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground"
                    >
                      {trigger}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filteredSkills.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
            검색 결과가 없어요.
          </p>
        )}
      </div>

      {/* Orchestrator Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{data.orchestrator.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {data.orchestrator.description}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Commands */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">명령어</p>
            {data.orchestrator.commands.map((cmd) => (
              <div key={cmd.command} className="flex items-center gap-2 text-sm">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {cmd.command}
                </code>
                <span className="text-muted-foreground">{cmd.description}</span>
              </div>
            ))}
          </div>

          {/* Stage Flow */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">워크플로우 단계</p>
            <div className="flex flex-wrap items-center gap-1">
              {data.orchestrator.stages.map((stage, i) => (
                <div key={stage.id} className="flex items-center gap-1">
                  <div className="rounded-md border bg-muted/50 px-2 py-1 text-xs">
                    <span className="font-medium">{stage.id}</span>{" "}
                    <span className="text-muted-foreground">{stage.name}</span>
                  </div>
                  {i < data.orchestrator.stages.length - 1 && (
                    <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
