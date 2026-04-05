/**
 * Sprint 156: F347 — 2-2 시장 검증 탭
 * TAM/SAM/SOM PieChart + Pain Point 맵 + ROI 표
 */
import type { MarketValidationData } from "@foundry-x/shared";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { StepHeader } from "../StepHeader";
import { MetricCard } from "../MetricCard";
import { InsightBox } from "../InsightBox";

interface Props {
  data: unknown;
}

function parseData(raw: unknown): MarketValidationData {
  if (!raw || typeof raw !== "object") return {};
  return raw as MarketValidationData;
}

const MARKET_COLORS = ["#00b493", "#3182f6", "#f59e0b"];

function MarketPieChart({ tam, sam, som }: {
  tam?: MarketValidationData["tam"];
  sam?: MarketValidationData["sam"];
  som?: MarketValidationData["som"];
}) {
  if (!tam && !sam && !som) return null;

  const chartData = [
    tam && { name: `TAM (${tam.unit})`, value: tam.value },
    sam && { name: `SAM (${sam.unit})`, value: sam.value },
    som && { name: `SOM (${som.unit})`, value: som.value },
  ].filter(Boolean) as Array<{ name: string; value: number }>;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={MARKET_COLORS[i % MARKET_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function MarketValidationTab({ data: raw }: Props) {
  const data = parseData(raw);

  if (!data.tam && !data.painPoints && !data.roi) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        시장 검증 데이터가 아직 없어요
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepHeader stepNum="2-2" title="시장 검증" color="var(--discovery-mint)" />

      {/* 메트릭 카드 */}
      <div className="grid grid-cols-3 gap-4">
        {data.tam && <MetricCard label="TAM" value={data.tam.value.toLocaleString()} unit={data.tam.unit} />}
        {data.sam && <MetricCard label="SAM" value={data.sam.value.toLocaleString()} unit={data.sam.unit} />}
        {data.som && <MetricCard label="SOM" value={data.som.value.toLocaleString()} unit={data.som.unit} />}
      </div>

      {/* 도넛 차트 */}
      <MarketPieChart tam={data.tam} sam={data.sam} som={data.som} />

      {/* Pain Point 맵 */}
      {data.painPoints && data.painPoints.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Pain Point 맵</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {data.painPoints.map((pp, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="text-sm font-medium">{pp.pain}</div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>심각도: {pp.severity}/10</span>
                  <span>빈도: {pp.frequency}</span>
                  <span>세그먼트: {pp.segment}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pp.severity * 10}%`,
                      backgroundColor: pp.severity >= 7 ? "var(--discovery-red)" : "var(--discovery-amber)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROI 표 */}
      {data.roi && (
        <div>
          <h3 className="text-sm font-semibold mb-2">ROI 분석</h3>
          <div className="grid grid-cols-3 gap-4">
            <MetricCard label="투자액" value={data.roi.investment.toLocaleString()} unit="원" />
            <MetricCard label="수익" value={data.roi.return.toLocaleString()} unit="원" trend="up" />
            <MetricCard label="회수 기간" value={data.roi.period} />
          </div>
          {data.roi.metrics && data.roi.metrics.length > 0 && (
            <table className="w-full text-sm border mt-3">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left p-2 border">지표</th>
                  <th className="text-left p-2 border">값</th>
                </tr>
              </thead>
              <tbody>
                {data.roi.metrics.map((m, i) => (
                  <tr key={i}>
                    <td className="p-2 border">{m.label}</td>
                    <td className="p-2 border font-medium">{m.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <InsightBox title="시장 분석 요약">
        TAM/SAM/SOM 기반 시장 규모가 산정되었어요.
        Pain Point 심각도와 빈도를 교차 분석하여 기회 영역을 확인하세요.
      </InsightBox>
    </div>
  );
}
