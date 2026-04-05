/**
 * Sprint 157: F348 — 2-5 기회 선정 탭
 * ICE 매트릭스 + Go/NoGo 게이트 체크리스트
 */
import type { OpportunityScoringData } from "@foundry-x/shared";
import { StepHeader } from "../StepHeader";
import { InsightBox } from "../InsightBox";

interface Props {
  data: unknown;
}

function parseData(raw: unknown): OpportunityScoringData {
  if (!raw || typeof raw !== "object") return {};
  return raw as OpportunityScoringData;
}

function IceMatrix({ items }: { items: OpportunityScoringData["iceMatrix"] }) {
  if (!items || items.length === 0) return null;

  const sorted = [...items].sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">ICE 매트릭스</h3>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left p-2 border">기회</th>
            <th className="text-center p-2 border w-16">Impact</th>
            <th className="text-center p-2 border w-16">Confidence</th>
            <th className="text-center p-2 border w-16">Ease</th>
            <th className="text-center p-2 border w-20">총점</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((item, i) => (
            <tr key={i} className={i === 0 ? "bg-amber-50" : ""}>
              <td className="p-2 border">{item.opportunity}</td>
              <td className="text-center p-2 border">{item.impact}</td>
              <td className="text-center p-2 border">{item.confidence}</td>
              <td className="text-center p-2 border">{item.ease}</td>
              <td className="text-center p-2 border font-bold">{item.totalScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GoNoGoGate({ gates }: { gates: OpportunityScoringData["goNoGoGate"] }) {
  if (!gates || gates.length === 0) return null;

  const passCount = gates.filter((g) => g.passed).length;
  const allPassed = passCount === gates.length;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">
        Go/No-Go 게이트
        <span className={`ml-2 text-xs ${allPassed ? "text-green-600" : "text-amber-600"}`}>
          ({passCount}/{gates.length} 통과)
        </span>
      </h3>
      <div className="space-y-1">
        {gates.map((gate, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className={gate.passed ? "text-green-600" : "text-red-500"}>
              {gate.passed ? "✓" : "✗"}
            </span>
            <div>
              <span>{gate.criterion}</span>
              {gate.note && (
                <span className="text-xs text-muted-foreground ml-2">— {gate.note}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OpportunityScoringTab({ data: raw }: Props) {
  const data = parseData(raw);

  if (!data.iceMatrix && !data.goNoGoGate) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>기회 선정 데이터가 아직 없어요</p>
        <p className="text-xs mt-1">2-5 단계를 완료하면 결과가 표시돼요</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepHeader stepNum="2-5" title="기회 선정" color="var(--discovery-amber)" />
      <IceMatrix items={data.iceMatrix} />
      <GoNoGoGate gates={data.goNoGoGate} />
      {data.recommendation && (
        <InsightBox title="추천 기회"><p>{data.recommendation}</p></InsightBox>
      )}
    </div>
  );
}
