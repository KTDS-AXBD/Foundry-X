"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchApi, deleteApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

interface IdeaDetailPageProps {
  ideaId: string;
}

export default function IdeaDetailPage({ ideaId }: IdeaDetailPageProps) {
  const router = useRouter();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchApi<Idea>(`/ax-bd/ideas/${ideaId}`);
        setIdea(data);
      } catch {
        setError("아이디어를 불러올 수 없어요.");
      } finally {
        setLoading(false);
      }
    })();
  }, [ideaId]);

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠어요?")) return;
    setDeleting(true);
    try {
      await deleteApi(`/ax-bd/ideas/${ideaId}`);
      router.replace("/ax-bd/ideas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했어요.");
      setDeleting(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">로딩 중...</div>;

  if (error || !idea) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error ?? "아이디어를 찾을 수 없어요."}</p>
        <a href="/ax-bd/ideas" className="mt-2 inline-block text-sm text-primary hover:underline">
          목록으로 돌아가기
        </a>
      </div>
    );
  }

  const syncBadge =
    idea.syncStatus === "synced"
      ? "bg-green-500/20 text-green-400"
      : idea.syncStatus === "pending"
        ? "bg-yellow-500/20 text-yellow-400"
        : "bg-red-500/20 text-red-400";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <a href="/ax-bd/ideas" className="text-sm text-muted-foreground hover:underline">
            ← 아이디어 목록
          </a>
          <h1 className="mt-2 text-2xl font-bold">{idea.title}</h1>
        </div>
        <div className="flex gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs ${syncBadge}`}>
            {idea.syncStatus === "synced" ? "동기화 완료" : idea.syncStatus === "pending" ? "대기 중" : "동기화 실패"}
          </span>
          <a href={`/ax-bd/bmc/new?ideaId=${idea.id}`}>
            <Button variant="outline">BMC 생성</Button>
          </a>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "삭제 중..." : "삭제"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          {idea.description ? (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">설명</h2>
              <p className="text-sm">{idea.description}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">설명이 없어요.</p>
          )}

          {idea.tags.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">태그</h2>
              <div className="flex flex-wrap gap-1">
                {idea.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-secondary px-3 py-1 text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-4 text-xs text-muted-foreground">
            <p>생성일: {new Date(idea.createdAt).toLocaleString("ko-KR")}</p>
            <p>수정일: {new Date(idea.updatedAt).toLocaleString("ko-KR")}</p>
          </div>
        </CardContent>
      </Card>

      {/* BMC 연결 확장점 (Sprint 63 F203) */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-semibold">연결된 BMC</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            이 아이디어에 연결된 BMC 캔버스가 없어요. Sprint 63에서 연결 기능이 추가돼요.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
