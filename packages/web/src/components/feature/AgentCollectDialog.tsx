"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface AgentCollectDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { keywords: string[]; maxItems: number; focusArea?: string }) => Promise<void>;
}

export default function AgentCollectDialog({ open, onClose, onSubmit }: AgentCollectDialogProps) {
  const [keywordsInput, setKeywordsInput] = useState("");
  const [maxItems, setMaxItems] = useState(5);
  const [focusArea, setFocusArea] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const keywords = keywordsInput
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (keywords.length === 0) return;

    setLoading(true);
    try {
      await onSubmit({
        keywords,
        maxItems,
        focusArea: focusArea || undefined,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Agent 자동 수집</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                키워드 (쉼표 구분)
              </label>
              <input
                type="text"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="AI 손해사정, 보험 자동화"
                className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                최대 수집 건수
              </label>
              <input
                type="number"
                value={maxItems}
                onChange={(e) => setMaxItems(Number(e.target.value))}
                min={1}
                max={10}
                className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                산업 분야 (선택)
              </label>
              <input
                type="text"
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                placeholder="보험, 공공, 통신"
                className="w-full rounded border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded border px-4 py-2 text-sm hover:bg-muted"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? "수집 중..." : "수집 시작"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
