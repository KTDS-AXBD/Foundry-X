"use client";

import { useState } from "react";
import { postApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface IdeaCreateFormProps {
  onCreated: () => void;
  onCancel: () => void;
}

const AVAILABLE_TAGS = [
  "AI", "SaaS", "B2B", "B2C", "플랫폼", "데이터", "자동화", "헬스케어", "핀테크", "교육",
];

export default function IdeaCreateForm({ onCreated, onCancel }: IdeaCreateFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("제목을 입력해 주세요.");
      return;
    }
    if (description.length > 200) {
      setError("설명은 200자 이내로 입력해 주세요.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await postApi("/ax-bd/ideas", {
        title: trimmedTitle,
        description: description.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "아이디어 등록에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium">
              제목 <span className="text-destructive">*</span>
            </label>
            <input
              className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="아이디어 제목"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium">
              설명 <span className="text-muted-foreground">({description.length}/200)</span>
            </label>
            <textarea
              className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="간단한 설명 (선택)"
              maxLength={200}
              rows={3}
            />
          </div>

          <div>
            <label className="text-xs font-medium">태그 (복수 선택 가능)</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {AVAILABLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={
                    selectedTags.includes(tag)
                      ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                      : "rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
                  }
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              취소
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "등록 중..." : "등록"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
