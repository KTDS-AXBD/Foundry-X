"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { postApi } from "@/lib/api-client";

const CATEGORIES = [
  { value: "cost_reduction", label: "비용 절감" },
  { value: "new_business", label: "신규 사업" },
  { value: "process_improvement", label: "프로세스 개선" },
  { value: "technology", label: "기술" },
  { value: "other", label: "기타" },
];

interface IrProposalFormProps {
  onSubmit?: () => void | Promise<void>;
}

export function IrProposalForm({ onSubmit }: IrProposalFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [rationale, setRationale] = useState("");
  const [expectedImpact, setExpectedImpact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "제목을 입력해주세요";
    if (!description.trim() || description.trim().length < 10)
      newErrors.description = "설명은 최소 10자 이상이어야 해요";
    if (!category) newErrors.category = "카테고리를 선택해주세요";
    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await postApi("/ir-proposals", {
        title: title.trim(),
        description: description.trim(),
        category,
        rationale: rationale.trim() || undefined,
        expectedImpact: expectedImpact.trim() || undefined,
      });
      await onSubmit?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-1">
        <label className="text-sm font-medium">
          제목 <span className="text-red-500">*</span>
        </label>
        <input
          className={`w-full border rounded px-3 py-2 text-sm ${errors.title ? "border-red-400" : ""}`}
          placeholder="제안 제목을 입력해주세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-sm font-medium">
          설명 <span className="text-red-500">*</span>
          <span className="text-xs text-muted-foreground ml-1">(최소 10자)</span>
        </label>
        <textarea
          className={`w-full border rounded px-3 py-2 text-sm ${errors.description ? "border-red-400" : ""}`}
          placeholder="제안 내용을 자세히 설명해주세요"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        {errors.description && (
          <p className="text-xs text-red-500">{errors.description}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-1">
        <label className="text-sm font-medium">
          카테고리 <span className="text-red-500">*</span>
        </label>
        <select
          className={`w-full border rounded px-3 py-2 text-sm ${errors.category ? "border-red-400" : ""}`}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">카테고리 선택</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
      </div>

      {/* Rationale */}
      <div className="space-y-1">
        <label className="text-sm font-medium">근거</label>
        <textarea
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="제안의 근거나 배경을 작성해주세요"
          rows={3}
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
        />
      </div>

      {/* Expected Impact */}
      <div className="space-y-1">
        <label className="text-sm font-medium">기대 효과</label>
        <textarea
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="예상되는 효과나 성과를 작성해주세요"
          rows={3}
          value={expectedImpact}
          onChange={(e) => setExpectedImpact(e.target.value)}
        />
      </div>

      <Button onClick={handleSubmit} disabled={submitting} className="w-full">
        {submitting ? "제출 중..." : "제안 제출"}
      </Button>
    </div>
  );
}
