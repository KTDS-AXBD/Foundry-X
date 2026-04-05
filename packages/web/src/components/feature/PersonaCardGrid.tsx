/**
 * Sprint 155 F344: PersonaCardGrid — 8개 KT DS 페르소나 카드 2×4 그리드
 */
import type { PersonaConfig } from "@/lib/stores/persona-eval-store";

interface PersonaCardGridProps {
  personas: PersonaConfig[];
  selectedPersonaId?: string;
  onSelectPersona: (id: string) => void;
}

const WEIGHT_AXES_LABELS: Record<string, string> = {
  businessViability: "사업성",
  strategicFit: "전략적합",
  customerValue: "고객가치",
  techMarket: "기술시장",
  execution: "실행력",
  financialFeasibility: "재무타당",
  competitiveDiff: "경쟁차별",
};

export default function PersonaCardGrid({ personas, selectedPersonaId, onSelectPersona }: PersonaCardGridProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {personas.map((persona) => {
        const isSelected = persona.personaId === selectedPersonaId;
        const totalWeight = Object.values(persona.weights).reduce((s, v) => s + v, 0);

        return (
          <button
            key={persona.personaId}
            type="button"
            onClick={() => onSelectPersona(persona.personaId)}
            className={`rounded-lg border p-4 text-left transition-all hover:shadow-md ${
              isSelected
                ? "border-[#8b5cf6] bg-[#8b5cf6]/5 ring-2 ring-[#8b5cf6]/30"
                : "border-border hover:border-[#8b5cf6]/50"
            }`}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">{persona.personaName}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${totalWeight === 100 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {totalWeight}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{persona.role}</p>
            <div className="flex flex-wrap gap-1">
              {persona.focus.map((f) => (
                <span key={f} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{f}</span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
