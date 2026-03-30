"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApi, postApi } from "@/lib/api-client";
import { FileText, Link, Image, Video, Plus, Copy, Check } from "lucide-react";

interface PackItem {
  id: string;
  type: "document" | "link" | "image" | "video";
  title: string;
  url?: string;
  content?: string;
}

interface OfferingPackDetail {
  id: string;
  title: string;
  description?: string;
  bizItemId?: string;
  status: "draft" | "review" | "approved" | "shared";
  items: PackItem[];
  shareToken?: string;
  createdAt: string;
}

const ITEM_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  link: Link,
  image: Image,
  video: Video,
};

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  review: "검토중",
  approved: "승인",
  shared: "공유됨",
};

const STATUS_TRANSITIONS: Record<string, string> = {
  draft: "review",
  review: "approved",
  approved: "shared",
};

interface OfferingPackDetailProps {
  packId: string;
}

export function OfferingPackDetail({ packId }: OfferingPackDetailProps) {
  const [pack, setPack] = useState<OfferingPackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addType, setAddType] = useState<PackItem["type"]>("document");
  const [addUrl, setAddUrl] = useState("");
  const [addContent, setAddContent] = useState("");
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchApi<OfferingPackDetail>(`/offering-packs/${packId}`);
      setPack(data);
    } finally {
      setLoading(false);
    }
  }, [packId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleAddItem = async () => {
    if (!addTitle.trim()) return;
    setAdding(true);
    try {
      await postApi(`/offering-packs/${packId}/items`, {
        type: addType,
        title: addTitle.trim(),
        url: addUrl.trim() || undefined,
        content: addContent.trim() || undefined,
      });
      setShowAddForm(false);
      setAddTitle("");
      setAddUrl("");
      setAddContent("");
      await loadData();
    } finally {
      setAdding(false);
    }
  };

  const handleStatusChange = async () => {
    if (!pack) return;
    const nextStatus = STATUS_TRANSITIONS[pack.status];
    if (!nextStatus) return;
    setUpdatingStatus(true);
    try {
      await postApi(`/offering-packs/${packId}/status`, { status: nextStatus });
      await loadData();
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleGenerateShareLink = async () => {
    await postApi(`/offering-packs/${packId}/share`, {});
    await loadData();
  };

  const handleCopyShareLink = async () => {
    if (!pack?.shareToken) return;
    const url = `${window.location.origin}/shared/pack/${pack.shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        패키지를 찾을 수 없어요.
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">{pack.title}</h2>
          {pack.description && (
            <p className="text-sm text-muted-foreground mt-1">{pack.description}</p>
          )}
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
          {STATUS_LABELS[pack.status]}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TRANSITIONS[pack.status] && (
          <Button size="sm" variant="outline" onClick={handleStatusChange} disabled={updatingStatus}>
            {updatingStatus ? "변경 중..." : `→ ${STATUS_LABELS[STATUS_TRANSITIONS[pack.status]]}`}
          </Button>
        )}
        {!pack.shareToken ? (
          <Button size="sm" variant="outline" onClick={handleGenerateShareLink}>
            공유 링크 생성
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={handleCopyShareLink}>
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                복사됨!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                링크 복사
              </>
            )}
          </Button>
        )}
      </div>

      {/* Items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">항목 목록 ({pack.items.length}개)</h3>
          <Button size="sm" variant="ghost" onClick={() => setShowAddForm((v) => !v)}>
            <Plus className="h-3 w-3 mr-1" />
            항목 추가
          </Button>
        </div>

        {showAddForm && (
          <div className="border rounded p-3 space-y-3 bg-muted/20">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">타입</label>
                <select
                  className="w-full border rounded px-2 py-1 text-xs"
                  value={addType}
                  onChange={(e) => setAddType(e.target.value as PackItem["type"])}
                >
                  <option value="document">문서</option>
                  <option value="link">링크</option>
                  <option value="image">이미지</option>
                  <option value="video">비디오</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">제목 *</label>
                <input
                  className="w-full border rounded px-2 py-1 text-xs"
                  placeholder="항목 제목"
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">URL</label>
              <input
                className="w-full border rounded px-2 py-1 text-xs"
                placeholder="https://..."
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">내용</label>
              <textarea
                className="w-full border rounded px-2 py-1 text-xs"
                placeholder="항목 내용"
                rows={2}
                value={addContent}
                onChange={(e) => setAddContent(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
                취소
              </Button>
              <Button size="sm" onClick={handleAddItem} disabled={adding || !addTitle.trim()}>
                {adding ? "추가 중..." : "추가"}
              </Button>
            </div>
          </div>
        )}

        {pack.items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            항목이 없어요. 항목을 추가해보세요.
          </p>
        ) : (
          <div className="space-y-2">
            {pack.items.map((item) => {
              const Icon = ITEM_TYPE_ICONS[item.type] ?? FileText;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 border rounded p-3 hover:bg-muted/20"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate block"
                      >
                        {item.url}
                      </a>
                    )}
                    {item.content && (
                      <p className="text-xs text-muted-foreground truncate">{item.content}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
