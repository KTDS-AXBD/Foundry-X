/**
 * Sprint 157: F348 — 2-7 비즈니스 모델 탭
 * BMC 9블록 Grid + Unit Economics + 수익 시나리오
 */
import type { BusinessModelData } from "@foundry-x/shared";
import { StepHeader } from "../StepHeader";
import { MetricCard } from "../MetricCard";

interface Props {
  data: unknown;
}

function parseData(raw: unknown): BusinessModelData {
  if (!raw || typeof raw !== "object") return {};
  return raw as BusinessModelData;
}

const BMC_LAYOUT = [
  { key: "keyPartners", label: "핵심 파트너", row: "1/3", col: "1/2" },
  { key: "keyActivities", label: "핵심 활동", row: "1/2", col: "2/3" },
  { key: "keyResources", label: "핵심 자원", row: "2/3", col: "2/3" },
  { key: "valuePropositions", label: "가치 제안", row: "1/3", col: "3/4" },
  { key: "customerRelationships", label: "고객 관계", row: "1/2", col: "4/5" },
  { key: "channels", label: "채널", row: "2/3", col: "4/5" },
  { key: "customerSegments", label: "고객 세그먼트", row: "1/3", col: "5/6" },
  { key: "costStructure", label: "비용 구조", row: "3/4", col: "1/4" },
  { key: "revenueStreams", label: "수익원", row: "3/4", col: "4/6" },
] as const;

function BmcGrid({ bmc }: { bmc: BusinessModelData["bmc"] }) {
  if (!bmc) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Business Model Canvas</h3>
      <div
        className="grid gap-1 text-xs"
        style={{
          gridTemplateColumns: "repeat(5, 1fr)",
          gridTemplateRows: "auto auto auto",
        }}
      >
        {BMC_LAYOUT.map(({ key, label, row, col }) => {
          const items = bmc[key as keyof typeof bmc] ?? [];
          return (
            <div
              key={key}
              className="border rounded p-2 bg-card"
              style={{ gridRow: row, gridColumn: col }}
            >
              <div className="font-medium text-amber-700 mb-1">{label}</div>
              <ul className="space-y-0.5">
                {items.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UnitEconomics({ ue }: { ue: BusinessModelData["unitEconomics"] }) {
  if (!ue) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Unit Economics</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <MetricCard label="CAC" value={`$${ue.cac.toLocaleString()}`} />
        <MetricCard label="LTV" value={`$${ue.ltv.toLocaleString()}`} />
        <MetricCard label="ARPU" value={`$${ue.arpu.toLocaleString()}`} />
        <MetricCard label="Gross Margin" value={`${ue.grossMargin}%`} />
        <MetricCard label="Payback" value={`${ue.paybackMonths}개월`} />
      </div>
      {ue.ltv > 0 && ue.cac > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          LTV/CAC 비율: <span className="font-bold">{(ue.ltv / ue.cac).toFixed(1)}x</span>
          {ue.ltv / ue.cac >= 3 ? " ✅ 건전" : " ⚠️ 개선 필요 (3x 이상 권장)"}
        </div>
      )}
    </div>
  );
}

function RevenueScenarios({ scenarios }: { scenarios: BusinessModelData["revenueScenarios"] }) {
  if (!scenarios || scenarios.length === 0) return null;

  const scenarioLabels: Record<string, string> = {
    optimistic: "낙관",
    base: "기본",
    pessimistic: "비관",
  };

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">수익 시나리오</h3>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left p-2 border">시나리오</th>
            <th className="text-right p-2 border">Year 1</th>
            <th className="text-right p-2 border">Year 2</th>
            <th className="text-right p-2 border">Year 3</th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((s, i) => (
            <tr key={i}>
              <td className="p-2 border font-medium">{scenarioLabels[s.scenario] ?? s.scenario}</td>
              <td className="text-right p-2 border">${s.year1.toLocaleString()}</td>
              <td className="text-right p-2 border">${s.year2.toLocaleString()}</td>
              <td className="text-right p-2 border">${s.year3.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BusinessModelTab({ data: raw }: Props) {
  const data = parseData(raw);

  if (!data.bmc && !data.unitEconomics && !data.revenueScenarios) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>비즈니스 모델 데이터가 아직 없어요</p>
        <p className="text-xs mt-1">2-7 단계를 완료하면 결과가 표시돼요</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepHeader stepNum="2-7" title="비즈니스 모델" color="var(--discovery-amber)" />
      <BmcGrid bmc={data.bmc} />
      <UnitEconomics ue={data.unitEconomics} />
      <RevenueScenarios scenarios={data.revenueScenarios} />
    </div>
  );
}
