/**
 * Sprint 155 F344: WeightSliderPanel — 7축 가중치 슬라이더 (합계 100%)
 */
import type { PersonaWeights } from "@/lib/stores/persona-eval-store";

interface WeightSliderPanelProps {
  personaId: string;
  weights: PersonaWeights;
  onChangeWeight: (personaId: string, key: string, value: number) => void;
}

const AXES: { key: keyof PersonaWeights; label: string; color: string }[] = [
  { key: "businessViability", label: "사업성", color: "#3182f6" },
  { key: "strategicFit", label: "전략적합성", color: "#00b493" },
  { key: "customerValue", label: "고객가치", color: "#8b5cf6" },
  { key: "techMarket", label: "기술/시장", color: "#f59e0b" },
  { key: "execution", label: "실행력", color: "#f04452" },
  { key: "financialFeasibility", label: "재무타당성", color: "#06b6d4" },
  { key: "competitiveDiff", label: "경쟁차별화", color: "#84cc16" },
];

export default function WeightSliderPanel({ personaId, weights, onChangeWeight }: WeightSliderPanelProps) {
  const total = Object.values(weights).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">가중치 설정</h3>
        <span className={`text-xs font-medium px-2 py-1 rounded ${
          total === 100 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
        }`}>
          합계: {total}%
        </span>
      </div>

      {AXES.map(({ key, label, color }) => (
        <div key={key} className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
          <input
            type="range"
            min={0}
            max={50}
            value={weights[key]}
            onChange={(e) => onChangeWeight(personaId, key, parseInt(e.target.value))}
            className="flex-1 h-2 appearance-none rounded-full cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${color} ${weights[key] * 2}%, #e5e7eb ${weights[key] * 2}%)`,
            }}
          />
          <span className="text-xs font-mono w-8 text-right">{weights[key]}%</span>
        </div>
      ))}

      {total !== 100 && (
        <p className="text-xs text-yellow-600 mt-2">
          가중치 합계가 {total}%입니다. 슬라이더 조정 시 자동 보정됩니다.
        </p>
      )}
    </div>
  );
}
