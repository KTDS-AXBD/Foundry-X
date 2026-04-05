/**
 * Sprint 155 F345: EvalResults — 종합 점수 + 판정 배너 + Radar 차트 + 페르소나별 요약
 */
import { useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { EvaluationResult } from "@/lib/stores/persona-eval-store";

interface EvalResultsProps {
  result: EvaluationResult;
}

const VERDICT_CONFIG = {
  green: { label: "Go", bg: "bg-green-100", text: "text-green-800", border: "border-green-300", desc: "사업 추진을 권장합니다" },
  keep: { label: "Conditional", bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300", desc: "조건부 추진 — 우려사항 해소 후 재검토" },
  red: { label: "No-Go", bg: "bg-red-100", text: "text-red-800", border: "border-red-300", desc: "사업 추진을 권장하지 않습니다" },
};

const AXIS_LABELS: Record<string, string> = {
  businessViability: "사업성",
  strategicFit: "전략적합",
  customerValue: "고객가치",
  techMarket: "기술/시장",
  execution: "실행력",
  financialFeasibility: "재무타당",
  competitiveDiff: "경쟁차별",
  scalability: "확장성",
};

const PERSONA_COLORS = [
  "#3182f6", "#00b493", "#8b5cf6", "#f59e0b",
  "#f04452", "#06b6d4", "#84cc16", "#ec4899",
];

export default function EvalResults({ result }: EvalResultsProps) {
  const [expandedPersona, setExpandedPersona] = useState<string | null>(null);
  const verdictInfo = VERDICT_CONFIG[result.verdict] ?? VERDICT_CONFIG.keep;

  // Radar 차트 데이터: 8축 × N 페르소나
  const radarData = Object.keys(AXIS_LABELS).map((axis) => {
    const entry: Record<string, string | number> = { axis: AXIS_LABELS[axis] };
    for (const score of result.scores) {
      entry[score.personaId] = score.scores[axis] ?? 0;
    }
    return entry;
  });

  return (
    <div className="space-y-6">
      {/* 판정 배너 */}
      <div className={`rounded-xl border-2 ${verdictInfo.border} ${verdictInfo.bg} p-6 text-center`}>
        <div className={`text-3xl font-bold ${verdictInfo.text}`}>{verdictInfo.label}</div>
        <div className={`text-sm ${verdictInfo.text} mt-1`}>{verdictInfo.desc}</div>
        <div className="mt-3 flex items-center justify-center gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">평균 점수: </span>
            <span className="font-semibold">{result.avgScore}/10</span>
          </div>
          <div>
            <span className="text-muted-foreground">우려사항: </span>
            <span className="font-semibold">{result.totalConcerns}건</span>
          </div>
        </div>
      </div>

      {/* Radar 차트 */}
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold mb-4">다축 평가 비교</h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10 }} />
            {result.scores.map((score, i) => (
              <Radar
                key={score.personaId}
                name={score.personaId}
                dataKey={score.personaId}
                stroke={PERSONA_COLORS[i % PERSONA_COLORS.length]}
                fill={PERSONA_COLORS[i % PERSONA_COLORS.length]}
                fillOpacity={0.1}
              />
            ))}
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 페르소나별 요약 */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">페르소나별 평가 요약</h3>
        {result.scores.map((score) => {
          const isExpanded = expandedPersona === score.personaId;
          const vConfig = VERDICT_CONFIG[score.verdict as keyof typeof VERDICT_CONFIG] ?? VERDICT_CONFIG.keep;

          return (
            <div key={score.personaId} className="rounded-lg border">
              <button
                type="button"
                onClick={() => setExpandedPersona(isExpanded ? null : score.personaId)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{score.personaId}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${vConfig.bg} ${vConfig.text}`}>
                    {vConfig.label}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {isExpanded ? "접기 ▲" : "펼치기 ▼"}
                </span>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 border-t">
                  {score.summary && (
                    <p className="text-sm text-muted-foreground mt-2">{score.summary}</p>
                  )}
                  {score.concerns.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-muted-foreground">우려사항:</span>
                      <ul className="mt-1 space-y-1">
                        {score.concerns.map((concern, ci) => (
                          <li key={ci} className="text-xs text-muted-foreground flex items-start gap-1">
                            <span className="text-yellow-500 mt-0.5">⚠</span>
                            {concern}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(score.scores).map(([key, val]) => (
                      <span key={key} className="text-[10px] bg-muted px-2 py-1 rounded">
                        {AXIS_LABELS[key] ?? key}: {typeof val === "number" ? val.toFixed(1) : val}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 경고사항 */}
      {result.warnings.length > 0 && (
        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
          <h3 className="text-sm font-semibold text-yellow-800 mb-2">주의사항</h3>
          {result.warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-700">{w}</p>
          ))}
        </div>
      )}
    </div>
  );
}
