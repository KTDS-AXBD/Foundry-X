"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "@/lib/api-client";
import TagFilter from "./TagFilter";
import IdeaCreateForm from "./IdeaCreateForm";

interface Idea {
  id: string;
  title: string;
  description: string | null;
  tags: string[];
  gitRef: string;
  authorId: string;
  orgId: string;
  syncStatus: "synced" | "pending" | "failed";
  createdAt: number;
  updatedAt: number;
}

interface IdeaListResponse {
  items: Idea[];
  total: number;
  page: number;
  limit: number;
}

export default function IdeaListPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchIdeas = useCallback(async () => {
    try {
      const params = selectedTag ? `?tag=${encodeURIComponent(selectedTag)}` : "";
      const data = await fetchApi<IdeaListResponse>(`/ax-bd/ideas${params}`);
      setIdeas(data.items);
    } catch {
      setIdeas([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTag]);

  useEffect(() => {
    fetchIdeas();
  }, [fetchIdeas]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">사업 아이디어</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          새 아이디어
        </button>
      </div>

      <TagFilter onSelect={setSelectedTag} selected={selectedTag} />

      {showForm && (
        <IdeaCreateForm
          onCreated={() => {
            setShowForm(false);
            fetchIdeas();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      ) : ideas.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">아직 아이디어가 없어요.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            &quot;새 아이디어&quot; 버튼으로 시작하세요.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea) => (
            <a
              key={idea.id}
              href={`/ax-bd/ideas/${idea.id}`}
              className="rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <h3 className="font-semibold">{idea.title}</h3>
              {idea.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {idea.description}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {idea.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-2 py-0.5 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(idea.updatedAt).toLocaleDateString("ko-KR")}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
