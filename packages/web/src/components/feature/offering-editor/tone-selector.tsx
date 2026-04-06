/**
 * F378: Tone Selector — 3가지 톤 선택 + 프리뷰/적용 (Sprint 171)
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdaptTone, AdaptResponse } from "@/lib/api-client";
import { adaptOfferingTone, previewOfferingTone } from "@/lib/api-client";

const TONE_OPTIONS: { value: AdaptTone; label: string; icon: string; desc: string }[] = [
  { value: "executive", label: "경영진 보고", icon: "📊", desc: "핵심 수치, ROI, 전략적 판단 강조" },
  { value: "technical", label: "기술 제안", icon: "🔧", desc: "아키텍처, 구현 상세, 기술 스택" },
  { value: "critical", label: "검토/심사", icon: "🔍", desc: "리스크, 한계, 대안, 객관적 평가" },
];

interface ToneSelectorProps {
  offeringId: string;
  onAdapted?: (result: AdaptResponse) => void;
}

export function ToneSelector({ offeringId, onAdapted }: ToneSelectorProps) {
  const [tone, setTone] = useState<AdaptTone>("executive");
  const [preview, setPreview] = useState<AdaptResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const result = await previewOfferingTone(offeringId, tone);
      setPreview(result);
    } catch (err) {
      console.error("Preview failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const result = await adaptOfferingTone(offeringId, tone);
      setPreview(null);
      onAdapted?.(result);
    } catch (err) {
      console.error("Adapt failed:", err);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">콘텐츠 톤 변환</h3>
        <div className="grid grid-cols-3 gap-2">
          {TONE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setTone(opt.value); setPreview(null); }}
              className={`rounded-lg border p-3 text-left transition-colors ${
                tone === opt.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="text-lg mb-1">{opt.icon}</div>
              <div className="text-sm font-medium">{opt.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreview}
          disabled={loading}
        >
          {loading ? "프리뷰 중..." : "프리뷰"}
        </Button>
        <Button
          size="sm"
          onClick={handleApply}
          disabled={applying}
        >
          {applying ? "적용 중..." : "톤 적용"}
        </Button>
      </div>

      {preview && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">
            프리뷰 — {TONE_OPTIONS.find((o) => o.value === preview.tone)?.label} ({preview.sectionCount}개 섹션)
          </h4>
          <div className="max-h-64 overflow-y-auto rounded-md border p-3 text-sm">
            {preview.adaptedSections.map((s) => (
              <div key={s.sectionKey} className="mb-3 last:mb-0">
                <div className="text-xs font-semibold text-primary">{s.title}</div>
                <div className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">
                  {s.content.slice(0, 200)}
                  {s.content.length > 200 && "..."}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
