"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postApi } from "@/lib/api-client";

interface ShareDialogProps {
  bizItemId: string;
  onCreated?: (token: string) => void;
}

export function ShareDialog({ bizItemId, onCreated }: ShareDialogProps) {
  const [accessLevel, setAccessLevel] = useState<"view" | "comment" | "edit">("view");
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(7);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const result = await postApi<{ token: string }>("/share-links", {
        bizItemId,
        accessLevel,
        expiresInDays,
      });
      const url = `${window.location.origin}/shared/${result.token}`;
      setShareUrl(url);
      onCreated?.(result.token);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">공유 링크 생성</h3>

      <div className="space-y-2">
        <Label>접근 레벨</Label>
        <div className="flex gap-2">
          {(["view", "comment", "edit"] as const).map((level) => (
            <Button
              key={level}
              variant={accessLevel === level ? "default" : "outline"}
              size="sm"
              onClick={() => setAccessLevel(level)}
            >
              {level === "view" ? "보기" : level === "comment" ? "댓글" : "편집"}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>만료 기간</Label>
        <div className="flex gap-2">
          {[1, 7, 30, undefined].map((days) => (
            <Button
              key={days ?? "unlimited"}
              variant={expiresInDays === days ? "default" : "outline"}
              size="sm"
              onClick={() => setExpiresInDays(days)}
            >
              {days ? `${days}일` : "무제한"}
            </Button>
          ))}
        </div>
      </div>

      {!shareUrl ? (
        <Button onClick={handleCreate} disabled={loading} className="w-full">
          {loading ? "생성 중..." : "공유 링크 생성"}
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input value={shareUrl} readOnly className="flex-1" />
            <Button onClick={handleCopy} variant="outline">
              {copied ? "복사됨!" : "복사"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
