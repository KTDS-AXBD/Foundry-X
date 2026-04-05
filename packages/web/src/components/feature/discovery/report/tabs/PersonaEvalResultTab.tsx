/**
 * Sprint 157: F348 — 2-9 페르소나 평가 결과 탭
 * 종합 점수 카드 + Recharts Radar + 페르소나별 상세
 */
import type { PersonaEvalResultData } from "@foundry-x/shared";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { StepHeader } from "../StepHeader";
import { useState } from "react";

interface Props {
  data: unknown;
}

function parseData(raw: unknown): PersonaEvalResultData {
  if (!raw || typeof raw !== "object") return {};
  return raw as PersonaEvalResultData;
}

const VERDICT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  Go: { bg: "bg-green-100 border-green-300", text: "text-green-800", label: "Go" },
  Conditional: { bg: "bg-amber-100 border-amber-300", text: "text-amber-800", label: "Conditional" },
  NoGo: { bg: "bg-red-100 border-red-300", text: "text-red-800", label: "No-Go" },
};

function VerdictBanner({ score, verdict }: { score?: number; verdict?: string }) {
  const style = VERDICT_STYLES[verdict ?? ""] ?? VERDICT_STYLES.Conditional;

  return (
    <div className={`rounded-lg border-2 p-4 flex items-center justify-between ${style.bg}`}>
      <div>
        <div className={`text-2xl font-bold ${style.text}`}>{style.label}</div>
        <div className="text-xs text-muted-foreground">종합 판정</div>
      </div>
      {score != null && (
        <div className="text-right">
          <div className={`text-3xl font-bold ${style.text}`}>{score.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">/ 10.0</div>
        </div>
      )}
    </div>
  );
}

function EvalRadar({ axes }: { axes: PersonaEvalResultData["radarAxes"] }) {
  if (!axes || axes.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">7축 평가 레이더</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={axes}>
            <PolarGrid />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="var(--discovery-purple)"
              fill="var(--discovery-purple)"
              fillOpacity={0.3}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PersonaAccordion({ results }: { results: PersonaEvalResultData["personaResults"] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!results || results.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">페르소나별 상세</h3>
      <div className="space-y-1">
        {results.map((r) => {
          const style = VERDICT_STYLES[r.verdict] ?? VERDICT_STYLES.Conditional;
          const isOpen = expanded === r.personaId;

          return (
            <div key={r.personaId} className="border rounded-lg">
              <button
                className="w-full flex items-center justify-between p-3 text-sm hover:bg-muted/50"
                onClick={() => setExpanded(isOpen ? null : r.personaId)}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
                    {style.label}
                  </span>
                  <span className="font-medium">{r.personaName}</span>
                  <span className="text-xs text-muted-foreground">{r.personaRole}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{r.score.toFixed(1)}</span>
                  <span className="text-xs">{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 space-y-2 text-sm border-t">
                  <p className="mt-2">{r.summary}</p>
                  {r.concerns.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-red-600">우려사항</div>
                      <ul className="text-xs space-y-0.5">
                        {r.concerns.map((c, i) => <li key={i}>• {c}</li>)}
                      </ul>
                    </div>
                  )}
                  {r.conditions.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-amber-600">조건</div>
                      <ul className="text-xs space-y-0.5">
                        {r.conditions.map((c, i) => <li key={i}>• {c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PersonaEvalResultTab({ data: raw }: Props) {
  const data = parseData(raw);

  if (!data.overallVerdict && !data.radarAxes && !data.personaResults) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>페르소나 평가 결과가 아직 없어요</p>
        <p className="text-xs mt-1">멀티 페르소나 평가를 실행하면 결과가 표시돼요</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepHeader stepNum="2-9" title="페르소나 평가 결과" color="var(--discovery-purple)" />
      <VerdictBanner score={data.overallScore} verdict={data.overallVerdict} />
      <EvalRadar axes={data.radarAxes} />
      <PersonaAccordion results={data.personaResults} />
      {data.consensusSummary && (
        <div className="rounded-lg bg-purple-50 border border-purple-200 p-4 text-sm">
          <div className="text-xs font-medium text-purple-700 mb-1">합의 요약</div>
          <p>{data.consensusSummary}</p>
        </div>
      )}
    </div>
  );
}
