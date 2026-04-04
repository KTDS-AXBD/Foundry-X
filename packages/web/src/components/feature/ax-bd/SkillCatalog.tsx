"use client";

import { useState, useMemo } from "react";
import { Search, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BD_SKILLS,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  API_CATEGORY_LABELS,
  API_CATEGORY_COLORS,
  type SkillCategory,
} from "@/data/bd-skills";
import { BD_STAGES } from "@/data/bd-process";
import { useSkillList, useSkillSearch } from "@/hooks/useSkillRegistry";
import SkillCard from "./SkillCard";
import SkillDetailSheet from "./SkillDetailSheet";
import type { BdSkill } from "@/data/bd-skills";
import type { SkillRegistryEntry, SkillCategory as ApiCategory } from "@foundry-x/shared";

const LOCAL_CATEGORIES = Object.keys(CATEGORY_LABELS) as SkillCategory[];
const API_CATEGORIES: ApiCategory[] = ["bd-process", "analysis", "integration", "general", "validation", "generation"];
const STAGE_IDS = BD_STAGES.map((s) => s.id);

type SkillItem =
  | { source: "api"; entry: SkillRegistryEntry }
  | { source: "local"; skill: BdSkill };

function getSkillId(item: SkillItem): string {
  return item.source === "api" ? item.entry.skillId : item.skill.id;
}

function getSkillName(item: SkillItem): string {
  return item.source === "api" ? item.entry.name : item.skill.name;
}

function getSkillDescription(item: SkillItem): string {
  return item.source === "api" ? (item.entry.description ?? "") : item.skill.description;
}

function getSkillTags(item: SkillItem): string[] {
  return item.source === "api" ? item.entry.tags : item.skill.stages;
}

export default function SkillCatalog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApiCategory, setSelectedApiCategory] = useState<ApiCategory | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SkillItem | null>(null);

  // API 데이터 fetch
  const { items: apiItems, total: apiTotal, loading, error } = useSkillList({
    category: selectedApiCategory ?? undefined,
    limit: 100,
  });

  // API 검색 (디바운스)
  const { results: searchResults, loading: searchLoading } = useSkillSearch(searchQuery);

  // API 사용 가능 여부 — 데이터가 있거나 로딩 중이면 API 모드
  const useApi = loading || apiItems.length > 0;

  // API 모드: 검색 결과 또는 목록
  const apiFiltered = useMemo(() => {
    if (!useApi) return [];

    // 검색 모드일 때는 검색 결과 사용
    if (searchQuery.length >= 2 && searchResults) {
      let items = searchResults.results.map(
        (r): SkillItem => ({
          source: "api",
          entry: {
            id: "",
            tenantId: "",
            skillId: r.skillId,
            name: r.name,
            description: r.description,
            category: r.category,
            tags: r.tags,
            status: "active",
            safetyGrade: r.safetyGrade,
            safetyScore: 0,
            safetyCheckedAt: null,
            sourceType: "marketplace",
            sourceRef: null,
            promptTemplate: null,
            modelPreference: null,
            maxTokens: 4096,
            tokenCostAvg: 0,
            successRate: 0,
            totalExecutions: 0,
            currentVersion: 1,
            createdBy: "",
            updatedBy: null,
            createdAt: "",
            updatedAt: "",
          },
        }),
      );
      if (selectedStage) {
        items = items.filter((i) =>
          i.source === "api" && i.entry.tags.includes(selectedStage),
        );
      }
      return items;
    }

    // 목록 모드
    let items: SkillItem[] = apiItems.map((entry): SkillItem => ({ source: "api", entry }));
    if (selectedStage) {
      items = items.filter((i) =>
        i.source === "api" && i.entry.tags.includes(selectedStage),
      );
    }
    return items;
  }, [useApi, apiItems, searchQuery, searchResults, selectedStage]);

  // 폴백 모드: 정적 데이터
  const localFiltered = useMemo(() => {
    if (useApi) return [];

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
    if (selectedStage) {
      result = result.filter((s) => s.stages.includes(selectedStage));
    }
    return result.map((skill): SkillItem => ({ source: "local", skill }));
  }, [useApi, searchQuery, selectedStage]);

  const filtered = useApi ? apiFiltered : localFiltered;
  const totalCount = useApi ? apiTotal : BD_SKILLS.length;
  const isSearching = searchQuery.length >= 2 && searchLoading;

  // API 카테고리별 카운트 (로딩 전에는 정적 데이터 카운트)
  const categoryCounts = useMemo(() => {
    if (useApi) {
      const counts: Record<string, number> = {};
      for (const entry of apiItems) {
        counts[entry.category] = (counts[entry.category] ?? 0) + 1;
      }
      return counts;
    }
    const counts: Record<string, number> = {};
    for (const c of LOCAL_CATEGORIES) {
      counts[c] = BD_SKILLS.filter((s) => s.category === c).length;
    }
    return counts;
  }, [useApi, apiItems]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">BD 스킬 카탈로그</h1>
        <p className="text-sm text-muted-foreground">
          {totalCount}개 스킬 {useApi ? "(API)" : "+ 커맨드"} — 카테고리·단계별 탐색
        </p>
        {error && !useApi && (
          <p className="text-xs text-amber-600 mt-1">API 연결 실패 — 정적 데이터 표시 중</p>
        )}
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
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground">카테고리</h3>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={selectedApiCategory === null ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setSelectedApiCategory(null)}
          >
            전체 ({totalCount})
          </Badge>
          {useApi
            ? API_CATEGORIES.map((c) => (
                <Badge
                  key={c}
                  variant={selectedApiCategory === c ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer text-xs",
                    selectedApiCategory === c && API_CATEGORY_COLORS[c],
                  )}
                  onClick={() => setSelectedApiCategory(selectedApiCategory === c ? null : c)}
                >
                  {API_CATEGORY_LABELS[c]} ({categoryCounts[c] ?? 0})
                </Badge>
              ))
            : LOCAL_CATEGORIES.map((c) => (
                <Badge
                  key={c}
                  variant="outline"
                  className="cursor-pointer text-xs"
                  onClick={() => setSelectedApiCategory(null)}
                >
                  {CATEGORY_LABELS[c]} ({categoryCounts[c] ?? 0})
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
        {loading ? (
          <span className="flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> 로딩 중...
          </span>
        ) : (
          <>
            {filtered.length}개 결과
            {(searchQuery || selectedApiCategory || selectedStage) && " (필터 적용중)"}
          </>
        )}
      </div>

      {/* Skills Grid */}
      {!loading && filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          조건에 맞는 스킬이 없어요.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <SkillCard
              key={getSkillId(item)}
              item={item}
              onClick={() => setSelectedItem(item)}
            />
          ))}
        </div>
      )}

      {/* Detail Sheet */}
      {selectedItem && (
        <SkillDetailSheet
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
