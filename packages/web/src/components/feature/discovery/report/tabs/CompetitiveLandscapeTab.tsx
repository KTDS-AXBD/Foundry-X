/**
 * Sprint 156: F347 — 2-3 경쟁 구도 탭
 * SWOT 4분면 + Porter Radar 차트 + 포지셔닝맵
 */
import type { CompetitiveLandscapeData } from "@foundry-x/shared";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { StepHeader } from "../StepHeader";
import { InsightBox } from "../InsightBox";

interface Props {
  data: unknown;
}

function parseData(raw: unknown): CompetitiveLandscapeData {
  if (!raw || typeof raw !== "object") return {};
  return raw as CompetitiveLandscapeData;
}

function SwotGrid({ swot }: { swot: CompetitiveLandscapeData["swot"] }) {
  if (!swot) return null;

  const quadrants = [
    { label: "Strengths", items: swot.strengths, bg: "bg-green-50", border: "border-green-200" },
    { label: "Weaknesses", items: swot.weaknesses, bg: "bg-red-50", border: "border-red-200" },
    { label: "Opportunities", items: swot.opportunities, bg: "bg-blue-50", border: "border-blue-200" },
    { label: "Threats", items: swot.threats, bg: "bg-amber-50", border: "border-amber-200" },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">SWOT 분석</h3>
      <div className="grid grid-cols-2 gap-2">
        {quadrants.map((q) => (
          <div key={q.label} className={`rounded-lg border p-3 ${q.bg} ${q.border}`}>
            <div className="text-xs font-bold mb-1">{q.label}</div>
            <ul className="text-xs space-y-0.5">
              {(q.items ?? []).map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function PorterRadar({ porter }: { porter: CompetitiveLandscapeData["porter"] }) {
  if (!porter?.axes || porter.axes.length === 0) return null;

  const chartData = porter.axes.map((a) => ({
    axis: a.axis,
    score: a.score,
  }));

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Porter 5 Forces</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="var(--discovery-blue)"
              fill="var(--discovery-blue)"
              fillOpacity={0.3}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PositioningMap({ positions }: { positions: CompetitiveLandscapeData["positioning"] }) {
  if (!positions || positions.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">포지셔닝 맵</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name="가격" />
            <YAxis type="number" dataKey="y" name="품질" />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={positions} name="경쟁사">
              {positions.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.isOurs ? "var(--discovery-blue)" : "#94a3b8"}
                  r={entry.isOurs ? 8 : 5}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function CompetitiveLandscapeTab({ data: raw }: Props) {
  const data = parseData(raw);

  if (!data.swot && !data.porter && !data.positioning) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        경쟁 구도 데이터가 아직 없어요
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepHeader stepNum="2-3" title="경쟁 구도" color="var(--discovery-blue)" />

      <SwotGrid swot={data.swot} />
      <PorterRadar porter={data.porter} />
      <PositioningMap positions={data.positioning} />

      <InsightBox title="경쟁 분석 요약">
        SWOT과 Porter 5 Forces를 교차 분석하여 경쟁 우위 요소를 확인하세요.
        포지셔닝 맵에서 차별화 전략을 도출할 수 있어요.
      </InsightBox>
    </div>
  );
}
