/**
 * Sprint 155 F344: BriefingInput — 2-1~2-8 결과 자동 요약 + 수동 편집
 */
import { useState } from "react";
import { FileText, Wand2 } from "lucide-react";
import { fetchApi } from "@/lib/api-client";

interface BriefingInputProps {
  itemId: string;
  briefing: string;
  onChange: (text: string) => void;
}

export default function BriefingInput({ itemId, briefing, onChange }: BriefingInputProps) {
  const [generating, setGenerating] = useState(false);

  const handleAutoGenerate = async () => {
    setGenerating(true);
    try {
      // 기존 2-1~2-8 산출물에서 자동 요약 생성
      const data = await fetchApi<{ outputs: Array<{ stage_num: number; output_json: string }> }>(
        `/ax-bd/discovery/${itemId}/outputs`,
      );
      if (data.outputs && data.outputs.length > 0) {
        const summary = data.outputs
          .sort((a, b) => a.stage_num - b.stage_num)
          .map((o) => {
            try {
              const parsed = JSON.parse(o.output_json);
              return `[2-${o.stage_num}] ${parsed.title ?? parsed.summary ?? JSON.stringify(parsed).slice(0, 200)}`;
            } catch {
              return `[2-${o.stage_num}] ${o.output_json.slice(0, 200)}`;
            }
          })
          .join("\n\n");
        onChange(summary);
      } else {
        onChange("(이전 단계 결과가 없습니다. 수동으로 입력해주세요.)");
      }
    } catch {
      onChange("(자동 요약 생성 실패. 수동으로 입력해주세요.)");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">평가 브리핑</h3>
        </div>
        <button
          type="button"
          onClick={handleAutoGenerate}
          disabled={generating}
          className="flex items-center gap-1 text-xs text-[#8b5cf6] hover:text-[#8b5cf6]/80 disabled:opacity-50"
        >
          <Wand2 className="size-3" />
          {generating ? "생성 중..." : "자동 생성"}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        이전 발굴 단계(2-1~2-8) 결과를 요약하여 페르소나에게 전달할 브리핑을 작성해요.
      </p>

      <textarea
        value={briefing}
        onChange={(e) => onChange(e.target.value)}
        placeholder="사업 아이템에 대한 배경, 시장 분석 결과, 고객 조사 결과, 기술 검토 사항 등을 포함해주세요..."
        className="w-full rounded-md border px-3 py-2 text-sm min-h-[200px] resize-y"
      />

      <div className="text-xs text-muted-foreground text-right">
        {briefing.length.toLocaleString()} 자
      </div>
    </div>
  );
}
