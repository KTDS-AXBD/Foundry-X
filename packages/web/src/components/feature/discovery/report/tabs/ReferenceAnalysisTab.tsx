/**
 * Sprint 156: F347 — 2-1 레퍼런스 분석 탭
 * 3-Layer 테이블 + JTBD 비교 + 경쟁 비교
 */
import type { ReferenceAnalysisData } from "@foundry-x/shared";
import { StepHeader } from "../StepHeader";
import { InsightBox } from "../InsightBox";

interface Props {
  data: unknown;
}

function parseData(raw: unknown): ReferenceAnalysisData {
  if (!raw || typeof raw !== "object") return {};
  return raw as ReferenceAnalysisData;
}

function ThreeLayerTable({ layers }: { layers: ReferenceAnalysisData["threeLayers"] }) {
  if (!layers) return null;
  const sections = [
    { label: "Macro", data: layers.macro },
    { label: "Meso", data: layers.meso },
    { label: "Micro", data: layers.micro },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">3-Layer 분석</h3>
      {sections.map((section) => (
        <div key={section.label}>
          <h4 className="text-xs font-medium text-muted-foreground mb-1">{section.label}</h4>
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-2 border">요인</th>
                <th className="text-left p-2 border">트렌드</th>
                <th className="text-left p-2 border">영향</th>
              </tr>
            </thead>
            <tbody>
              {(section.data ?? []).map((row, i) => (
                <tr key={i}>
                  <td className="p-2 border">{row.factor}</td>
                  <td className="p-2 border">{row.trend}</td>
                  <td className="p-2 border">{row.impact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default function ReferenceAnalysisTab({ data: raw }: Props) {
  const data = parseData(raw);

  if (!data.threeLayers && !data.jtbd && !data.competitors) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        레퍼런스 분석 데이터가 아직 없어요
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepHeader stepNum="2-1" title="레퍼런스 분석" color="var(--discovery-mint)" />

      <ThreeLayerTable layers={data.threeLayers} />

      {/* JTBD 비교 */}
      {data.jtbd && data.jtbd.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">JTBD (Jobs-to-be-Done)</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {data.jtbd.map((item, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="text-sm font-medium">{item.job}</div>
                <div className="text-xs text-muted-foreground mt-1">현재: {item.current}</div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="text-xs">Pain: {item.painLevel}/10</div>
                  <div className="text-xs text-muted-foreground">빈도: {item.frequency}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 경쟁 비교표 */}
      {data.competitors && data.competitors.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">경쟁사 비교</h3>
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left p-2 border">이름</th>
                <th className="text-left p-2 border">강점</th>
                <th className="text-left p-2 border">약점</th>
                <th className="text-left p-2 border">점유율</th>
              </tr>
            </thead>
            <tbody>
              {data.competitors.map((c, i) => (
                <tr key={i}>
                  <td className="p-2 border font-medium">{c.name}</td>
                  <td className="p-2 border">{c.strength}</td>
                  <td className="p-2 border">{c.weakness}</td>
                  <td className="p-2 border">{c.share ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <InsightBox title="AI 분석 요약">
        레퍼런스 분석 결과, 주요 트렌드와 경쟁 구도가 식별되었어요.
        JTBD 기반으로 미충족 니즈를 확인하세요.
      </InsightBox>
    </div>
  );
}
