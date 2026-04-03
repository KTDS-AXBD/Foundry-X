"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { postApi } from "@/lib/api-client";

interface SectionReviewActionProps {
  runId: string;
  section: string;
  onReview: (result: { action: string; newStatus: string }) => void;
}

export default function SectionReviewAction({ runId, section, onReview }: SectionReviewActionProps) {
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);

  const handleReview = async (action: "approved" | "revision_requested" | "rejected") => {
    if ((action === "revision_requested" || action === "rejected") && !showComment) {
      setShowComment(true);
      return;
    }
    setLoading(true);
    try {
      const result = await postApi<{ action: string; newStatus: string }>(
        `/shaping/runs/${runId}/review`,
        { action, section, comment: comment || undefined },
      );
      onReview(result);
    } catch {
      // error handled at caller
    } finally {
      setLoading(false);
      setShowComment(false);
      setComment("");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-green-300 text-green-700 hover:bg-green-50"
          onClick={() => handleReview("approved")}
          disabled={loading}
        >
          승인
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-yellow-300 text-yellow-700 hover:bg-yellow-50"
          onClick={() => handleReview("revision_requested")}
          disabled={loading}
        >
          수정요청
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-red-300 text-red-700 hover:bg-red-50"
          onClick={() => handleReview("rejected")}
          disabled={loading}
        >
          반려
        </Button>
      </div>
      {showComment && (
        <div className="flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="사유를 입력하세요"
            className="flex-1 rounded border px-2 py-1 text-sm"
          />
          <Button size="sm" onClick={() => handleReview(showComment ? "revision_requested" : "approved")} disabled={loading}>
            제출
          </Button>
        </div>
      )}
    </div>
  );
}
