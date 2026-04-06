// F356: 피드백 입력 폼 (Sprint 160)

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const CATEGORIES = [
  { value: "layout", label: "레이아웃/디자인" },
  { value: "content", label: "텍스트/데이터" },
  { value: "functionality", label: "기능" },
  { value: "ux", label: "UX 개선" },
  { value: "other", label: "기타" },
] as const;

interface FeedbackFormProps {
  onSubmit: (data: { category: string; content: string }) => Promise<void>;
  disabled?: boolean;
}

export default function FeedbackForm({ onSubmit, disabled }: FeedbackFormProps) {
  const [category, setCategory] = useState("ux");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ category, content: content.trim() });
      setContent("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
              category === cat.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted"
            }`}
            onClick={() => setCategory(cat.value)}
            disabled={disabled}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <Textarea
        placeholder="개선 의견을 입력해 주세요..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        disabled={disabled}
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={disabled || submitting || !content.trim()}
        >
          {submitting ? "전송 중..." : "피드백 전송"}
        </Button>
      </div>
    </div>
  );
}
