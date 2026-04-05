/**
 * Sprint 157: F348 — 2-8 패키징 탭
 * GTM 전략 + Executive Summary + 마일스톤 타임라인
 */
import type { PackagingData } from "@foundry-x/shared";
import { StepHeader } from "../StepHeader";
import { InsightBox } from "../InsightBox";

interface Props {
  data: unknown;
}

function parseData(raw: unknown): PackagingData {
  if (!raw || typeof raw !== "object") return {};
  return raw as PackagingData;
}

function GtmStrategy({ gtm }: { gtm: PackagingData["gtmStrategy"] }) {
  if (!gtm) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">GTM 전략</h3>
      <div className="rounded-lg border p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Beachhead 시장</div>
            <div className="font-medium">{gtm.beachhead}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">타겟 세그먼트</div>
            <div className="font-medium">{gtm.targetSegment}</div>
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">포지셔닝</div>
          <div className="text-sm">{gtm.positioning}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">채널</div>
          <div className="flex flex-wrap gap-1">
            {gtm.channels.map((ch, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                {ch}
              </span>
            ))}
          </div>
        </div>
        {gtm.pricing && (
          <div>
            <div className="text-xs text-muted-foreground">가격 전략</div>
            <div className="text-sm">{gtm.pricing}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function ExecutiveSummaryCard({ summary }: { summary: PackagingData["executiveSummary"] }) {
  if (!summary) return null;

  const rows = [
    { label: "문제", value: summary.problem },
    { label: "솔루션", value: summary.solution },
    { label: "차별 가치", value: summary.uniqueValue },
    { label: "타겟 시장", value: summary.targetMarket },
    { label: "비즈니스 모델", value: summary.businessModel },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">Executive Summary</h3>
      <div className="rounded-lg border p-4 space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex gap-2 text-sm">
            <span className="text-muted-foreground shrink-0 w-24">{r.label}</span>
            <span>{r.value}</span>
          </div>
        ))}
        {summary.askAmount && (
          <div className="flex gap-2 text-sm pt-2 border-t">
            <span className="text-muted-foreground shrink-0 w-24">투자 요청</span>
            <span className="font-bold text-red-600">{summary.askAmount}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function Milestones({ milestones }: { milestones: PackagingData["milestones"] }) {
  if (!milestones || milestones.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-2">마일스톤</h3>
      <div className="space-y-3">
        {milestones.map((ms, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">
                {i + 1}
              </div>
              {i < milestones.length - 1 && <div className="w-px h-full bg-red-200" />}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{ms.phase}</span>
                <span className="text-xs text-muted-foreground">{ms.timeline}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {ms.deliverables.join(" · ")}
              </div>
              {ms.kpis.length > 0 && (
                <div className="text-xs text-red-600 mt-0.5">
                  KPI: {ms.kpis.join(", ")}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PackagingTab({ data: raw }: Props) {
  const data = parseData(raw);

  if (!data.gtmStrategy && !data.executiveSummary && !data.milestones) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>패키징 데이터가 아직 없어요</p>
        <p className="text-xs mt-1">2-8 단계를 완료하면 결과가 표시돼요</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StepHeader stepNum="2-8" title="패키징" color="var(--discovery-red)" />
      <GtmStrategy gtm={data.gtmStrategy} />
      <ExecutiveSummaryCard summary={data.executiveSummary} />
      <Milestones milestones={data.milestones} />
    </div>
  );
}
