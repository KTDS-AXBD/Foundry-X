/**
 * Sprint 157: F350 — 리포트 공유 링크 생성 버튼
 * 기존 share-links API를 활용하여 읽기전용 공유 URL 생성
 */
import { useState } from "react";
import { Share2 } from "lucide-react";
import { postApi } from "@/lib/api-client";

interface Props {
  itemId: string;
  title: string;
}

export default function ShareReportButton({ itemId, title }: Props) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }

    setLoading(true);
    try {
      const res = await postApi<{ token: string; url: string }>("/share-links", {
        bizItemId: itemId,
        accessLevel: "read",
        expiresInDays: 30,
        shareType: "discovery-report",
        metadata: { title },
      });
      const url = `${window.location.origin}/shared/report/${res.token}`;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted transition-colors disabled:opacity-50"
    >
      <Share2 className="size-4" />
      {copied ? "복사됨!" : loading ? "생성 중..." : shareUrl ? "링크 복사" : "공유"}
    </button>
  );
}
