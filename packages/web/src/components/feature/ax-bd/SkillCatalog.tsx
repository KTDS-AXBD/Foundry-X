"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BD_SKILLS,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type SkillCategory,
} from "@/data/bd-skills";
import { BD_STAGES } from "@/data/bd-process";
import SkillCard from "./SkillCard";
import SkillDetailSheet from "./SkillDetailSheet";
import type { BdSkill } from "@/data/bd-skills";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as SkillCategory[];
const STAGE_IDS = BD_STAGES.map((s) => s.id);

export default function SkillCatalog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<BdSkill | null>(null);

  const filtered = useMemo(() => {
    let result = BD_SKILLS;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q),
      );
    }

    if (selectedCategory) {
      result = result.filter((s) => s.category === selectedCategory);
    }

    if (selectedStage) {
      result = result.filter((s) => s.stages.includes(selectedStage));
    }

    return result;
  }, [searchQuery, selectedCategory, selectedStage]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of CATEGORIES) {
      counts[c] = BD_SKILLS.filter((s) => s.category === c).length;
    }
    return counts;
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">BD 스킬 카탈로그</h1>
        <p className="text-sm text-muted-foreground">
          {BD_SKILLS.length}개 스킬 + 커맨드 — 카테고리·단계별 탐색
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="스킬 검색 (이름, 설명, ID)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground">카테고리</h3>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setSelectedCategory(null)}
          >
            전체 ({BD_SKILLS.length})
          </Badge>
          {CATEGORIES.map((c) => (
            <Badge
              key={c}
              variant={selectedCategory === c ? "default" : "outline"}
              className={cn(
                "cursor-pointer text-xs",
                selectedCategory === c && CATEGORY_COLORS[c],
              )}
              onClick={() => setSelectedCategory(selectedCategory === c ? null : c)}
            >
              {CATEGORY_LABELS[c]} ({categoryCounts[c]})
            </Badge>
          ))}
        </div>
      </div>

      {/* Stage Filter */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground">추천 단계</h3>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={selectedStage === null ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setSelectedStage(null)}
          >
            전체
          </Badge>
          {STAGE_IDS.map((id) => {
            const stage = BD_STAGES.find((s) => s.id === id);
            return (
              <Badge
                key={id}
                variant={selectedStage === id ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setSelectedStage(selectedStage === id ? null : id)}
              >
                {id} {stage?.name}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Results count */}
      <div className="text-xs text-muted-foreground">
        {filtered.length}개 결과
        {(searchQuery || selectedCategory || selectedStage) && " (필터 적용중)"}
      </div>

      {/* Skills Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          조건에 맞는 스킬이 없어요.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onClick={() => setSelectedSkill(skill)}
            />
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      {selectedSkill && (
        <SkillDetailSheet
          skill={selectedSkill}
          onClose={() => setSelectedSkill(null)}
        />
      )}
    </div>
  );
}
