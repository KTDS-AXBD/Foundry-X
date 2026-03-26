"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export interface TeamFaqData {
  categories: string[];
  items: Array<{ id: string; category: string; question: string; answer: string }>;
}

export default function TeamFaqSection({ data }: { data: TeamFaqData | null }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("전체");

  const categories = useMemo(() => {
    if (!data) return ["전체"];
    return ["전체", ...data.categories];
  }, [data]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    return data.items.filter((item) => {
      const matchesSearch =
        !search ||
        item.question.toLowerCase().includes(search.toLowerCase()) ||
        item.answer.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "전체" || item.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [data, search, category]);

  const accordionItems = useMemo(
    () =>
      filteredItems.map((item) => ({
        value: item.id,
        trigger: item.question,
        content: item.answer,
      })),
    [filteredItems],
  );

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        FAQ 데이터를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold font-display mb-1">자주 묻는 질문</h2>
        <p className="text-sm text-muted-foreground mb-4">
          팀 가이드 관련 FAQ에요. 검색하거나 카테고리를 선택해 보세요.
        </p>
      </div>

      {/* Search + Category */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="질문 또는 답변 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
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

      {/* Accordion */}
      {accordionItems.length > 0 ? (
        <Accordion items={accordionItems} type="single" />
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          검색 결과가 없어요.
        </p>
      )}
    </div>
  );
}
