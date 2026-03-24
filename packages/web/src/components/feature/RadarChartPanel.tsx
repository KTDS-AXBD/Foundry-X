"use client";

import { Button } from "@/components/ui/button";

interface PersonaScore {
  personaId: string;
  personaName: string;
  businessViability: number;
  strategicFit: number;
  customerValue: number;
  techMarket: number;
  execution: number;
  financialFeasibility: number;
  competitiveDiff: number;
  scalability: number;
  summary: string;
  concerns: string[];
}

interface RadarChartPanelProps {
  evaluations: PersonaScore[];
  verdict: { verdict: string; avgScore: number; totalConcerns: number; warnings: string[] } | null;
  onEvaluate: () => void;
}

const AXES = [
  { key: "businessViability", label: "사업성" },
  { key: "strategicFit", label: "전략적합" },
  { key: "customerValue", label: "고객가치" },
  { key: "techMarket", label: "기술시장" },
  { key: "execution", label: "실행력" },
  { key: "financialFeasibility", label: "재무성" },
  { key: "competitiveDiff", label: "차별화" },
  { key: "scalability", label: "확장성" },
] as const;

const VERDICT_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  green: { color: "text-green-700", bg: "bg-green-100 border-green-300", label: "G (Green)" },
  keep: { color: "text-yellow-700", bg: "bg-yellow-100 border-yellow-300", label: "K (Keep)" },
  red: { color: "text-red-700", bg: "bg-red-100 border-red-300", label: "R (Red)" },
};

function polarToXY(angle: number, radius: number, cx: number, cy: number) {
  const rad = (angle - 90) * (Math.PI / 180);
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

function RadarChart({ averages }: { averages: number[] }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 80;
  const levels = [2, 4, 6, 8, 10];

  // Grid lines
  const gridLines = levels.map((level) => {
    const r = (level / 10) * maxR;
    const points = AXES.map((_, i) => {
      const angle = (360 / AXES.length) * i;
      const { x, y } = polarToXY(angle, r, cx, cy);
      return `${x},${y}`;
    }).join(" ");
    return <polygon key={level} points={points} fill="none" stroke="#e5e7eb" strokeWidth="0.5" />;
  });

  // Axis lines
  const axisLines = AXES.map((_, i) => {
    const angle = (360 / AXES.length) * i;
    const { x, y } = polarToXY(angle, maxR, cx, cy);
    return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#d1d5db" strokeWidth="0.5" />;
  });

  // Axis labels
  const labels = AXES.map((axis, i) => {
    const angle = (360 / AXES.length) * i;
    const { x, y } = polarToXY(angle, maxR + 16, cx, cy);
    return (
      <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="8" fill="#6b7280">
        {axis.label}
      </text>
    );
  });

  // Data polygon
  const dataPoints = averages.map((val, i) => {
    const angle = (360 / AXES.length) * i;
    const r = (val / 10) * maxR;
    const { x, y } = polarToXY(angle, r, cx, cy);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[250px] mx-auto">
      {gridLines}
      {axisLines}
      {labels}
      <polygon points={dataPoints} fill="rgba(59,130,246,0.2)" stroke="#3b82f6" strokeWidth="1.5" />
      {averages.map((val, i) => {
        const angle = (360 / AXES.length) * i;
        const r = (val / 10) * maxR;
        const { x, y } = polarToXY(angle, r, cx, cy);
        return <circle key={i} cx={x} cy={y} r="2.5" fill="#3b82f6" />;
      })}
    </svg>
  );
}

export default function RadarChartPanel({ evaluations, verdict, onEvaluate }: RadarChartPanelProps) {
  if (!verdict || evaluations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="mb-4">아직 페르소나 평가 결과가 없어요.</p>
        <Button onClick={onEvaluate}>페르소나 평가 시작</Button>
      </div>
    );
  }

  // 축별 평균
  const axisAverages = AXES.map((axis) => {
    const sum = evaluations.reduce((s, e) => s + (e[axis.key as keyof PersonaScore] as number), 0);
    return Math.round((sum / evaluations.length) * 10) / 10;
  });

  const cfg = VERDICT_CONFIG[verdict.verdict] ?? VERDICT_CONFIG.keep!;

  return (
    <div className="space-y-6">
      {/* G/K/R 판정 */}
      <div className={`flex items-center justify-between p-4 border rounded-lg ${cfg.bg}`}>
        <div>
          <p className="text-sm text-gray-500">페르소나 판정</p>
          <span className={`text-2xl font-bold ${cfg.color}`}>{cfg.label}</span>
          <span className="ml-3 text-lg">{verdict.avgScore.toFixed(1)}<span className="text-sm text-gray-400">/10</span></span>
        </div>
        <div className="text-right text-sm text-gray-500">
          <p>{evaluations.length}명 평가</p>
          <p>쟁점 {verdict.totalConcerns}건</p>
        </div>
      </div>

      {/* 경고 */}
      {verdict.warnings.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-800 mb-1">경고</p>
          {verdict.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-700">{w}</p>
          ))}
        </div>
      )}

      {/* 레이더 차트 */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-3 text-center">8축 평균 레이더</h3>
        <RadarChart averages={axisAverages} />
      </div>

      {/* 페르소나별 쟁점 */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-3">역할별 소견</h3>
        {evaluations.map((e) => (
          <details key={e.personaId} className="mb-2">
            <summary className="cursor-pointer text-sm font-medium py-1">
              {e.personaName} — {e.summary.slice(0, 50)}...
            </summary>
            <div className="pl-4 pt-2">
              <p className="text-xs text-gray-600 mb-2">{e.summary}</p>
              {e.concerns.length > 0 && (
                <ul className="list-disc list-inside text-xs text-gray-500">
                  {e.concerns.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              )}
            </div>
          </details>
        ))}
      </div>

      <div className="text-center">
        <Button variant="outline" size="sm" onClick={onEvaluate}>재평가</Button>
      </div>
    </div>
  );
}
