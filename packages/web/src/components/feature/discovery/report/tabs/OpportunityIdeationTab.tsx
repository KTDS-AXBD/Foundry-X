/**
 * Sprint 156: F347 — 2-4 기회 도출 탭
 * HMW 카드 + BMC 9블록 그리드 + Phase 타임라인
 */
import type { OpportunityIdeationData } from "@foundry-x/shared";
import { StepHeader } from "../StepHeader";
import { InsightBox } from "../InsightBox";

interface Props {
  data: unknown;
}

function parseData(raw: unknown): OpportunityIdeationData {
  if (!raw || typeof raw !== "object") return {};
  return raw as OpportunityIdeationData;
}

function HmwCards({ items }: { items: OpportunityIdeationData["hmw"] }) {
  if (!items || items.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">How Might We...?</h3>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-lg border p-3"
            style={{ borderLeftWidth: 3, borderLeftColor: "var(--discovery-blue)" }}
          >
            <div className="text-sm font-medium">{item.question}</div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{item.category}</span>
              <span className="text-xs text-muted-foreground">우선순위: {item.priority}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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

function BmcGrid({ bmc }: { bmc: OpportunityIdeationData["bmc"] }) {
  if (!bmc) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Business Model Canvas</h3>
      <div
        className="grid border rounded-lg overflow-hidden"
        style={{ gridTemplateColumns: "repeat(5, 1fr)", gridTemplateRows: "auto auto auto" }}
      >
        {BMC_LAYOUT.map((block) => {
          const items = bmc[block.key as keyof typeof bmc] ?? [];
          return (
            <div
              key={block.key}
              className="border p-2 min-h-[80px]"
              style={{ gridRow: block.row, gridColumn: block.col }}
            >
              <div className="text-xs font-bold text-muted-foreground mb-1">{block.label}</div>
              <ul className="text-xs space-y-0.5">
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

function PhaseTimeline({ phases }: { phases: OpportunityIdeationData["phases"] }) {
  if (!phases || phases.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Phase 타임라인</h3>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {phases.map((phase, i) => (
          <div key={i} className="flex items-center gap-2 shrink-0">
            <div className="rounded-lg border p-3 min-w-[180px]" style={{ borderTopWidth: 3, borderTopColor: "var(--discovery-blue)" }}>
              <div className="text-sm font-semibold">{phase.phase}</div>
              <div className="text-xs text-muted-foreground mt-1">{phase.description}</div>
              <div className="text-xs mt-2 font-medium">{phase.duration}</div>
              {phase.deliverables.length > 0 && (
                <ul className="text-xs text-muted-foreground mt-1">
                  {phase.deliverables.map((d, j) => (
                    <li key={j}>• {d}</li>
                  ))}
                </ul>
              )}
            </div>
            {i < phases.length - 1 && (
              <span className="text-muted-foreground">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OpportunityIdeationTab({ data: raw }: Props) {
  const data = parseData(raw);

  if (!data.hmw && !data.bmc && !data.phases) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        기회 도출 데이터가 아직 없어요
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepHeader stepNum="2-4" title="기회 도출" color="var(--discovery-blue)" />

      <HmwCards items={data.hmw} />
      <BmcGrid bmc={data.bmc} />
      <PhaseTimeline phases={data.phases} />

      <InsightBox title="기회 도출 요약">
        HMW 질문에서 도출된 기회와 BMC를 교차 검토하여
        실행 가능한 비즈니스 모델을 확정하세요.
      </InsightBox>
    </div>
  );
}
