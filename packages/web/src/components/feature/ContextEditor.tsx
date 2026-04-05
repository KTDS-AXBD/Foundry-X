/**
 * Sprint 155 F344: ContextEditor — 페르소나별 맥락 편집 (상황/우선순위/스타일/Red Line)
 */
import type { PersonaConfig, PersonaContext } from "@/lib/stores/persona-eval-store";

interface ContextEditorProps {
  personas: PersonaConfig[];
  selectedPersonaId: string;
  onSelectPersona: (id: string) => void;
  onUpdateContext: (personaId: string, context: PersonaContext) => void;
}

export default function ContextEditor({ personas, selectedPersonaId, onSelectPersona, onUpdateContext }: ContextEditorProps) {
  const selected = personas.find((p) => p.personaId === selectedPersonaId);
  if (!selected) return null;

  const ctx = selected.context;

  const handleChange = (field: keyof PersonaContext, value: string | string[]) => {
    onUpdateContext(selectedPersonaId, { ...ctx, [field]: value });
  };

  return (
    <div className="flex gap-4 min-h-[300px]">
      {/* 좌측: 페르소나 리스트 */}
      <div className="w-48 shrink-0 space-y-1">
        <h3 className="text-sm font-semibold mb-2">페르소나</h3>
        {personas.map((p) => (
          <button
            key={p.personaId}
            type="button"
            onClick={() => onSelectPersona(p.personaId)}
            className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
              p.personaId === selectedPersonaId
                ? "bg-[#8b5cf6]/10 text-[#8b5cf6] font-medium"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {p.personaName}
          </button>
        ))}
      </div>

      {/* 우측: 맥락 폼 */}
      <div className="flex-1 space-y-4">
        <h3 className="text-sm font-semibold">{selected.personaName} 평가 맥락</h3>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">평가 상황</label>
          <textarea
            value={ctx.situation}
            onChange={(e) => handleChange("situation", e.target.value)}
            placeholder="예: KT DS AI 사업부에서 헬스케어 AI 진출 검토"
            className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px] resize-y"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">우선순위 (쉼표 구분)</label>
          <input
            type="text"
            value={ctx.priorities.join(", ")}
            onChange={(e) => handleChange("priorities", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            placeholder="예: 수익성, 기존 역량 활용"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">평가 스타일</label>
          <select
            value={ctx.style}
            onChange={(e) => handleChange("style", e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="neutral">중립적</option>
            <option value="conservative">보수적</option>
            <option value="aggressive">공격적</option>
            <option value="cautious">신중한</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Red Lines (쉼표 구분)</label>
          <input
            type="text"
            value={ctx.redLines.join(", ")}
            onChange={(e) => handleChange("redLines", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
            placeholder="예: 투자 5억 초과 불가, 해외 진출 제외"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
