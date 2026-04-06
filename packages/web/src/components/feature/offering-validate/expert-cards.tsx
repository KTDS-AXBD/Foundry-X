/**
 * F377: Expert Cards — 5종 전문가 리뷰 카드 (Sprint 170)
 */

interface ExpertParsed {
  ta?: string;
  aa?: string;
  ca?: string;
  da?: string;
  qa?: string;
}

const EXPERT_CONFIG = [
  { key: "ta", label: "기술 아키텍트", abbr: "TA", color: "border-blue-200 bg-blue-50" },
  { key: "aa", label: "앱 아키텍트", abbr: "AA", color: "border-purple-200 bg-purple-50" },
  { key: "ca", label: "클라우드 아키텍트", abbr: "CA", color: "border-sky-200 bg-sky-50" },
  { key: "da", label: "데이터 아키텍트", abbr: "DA", color: "border-orange-200 bg-orange-50" },
  { key: "qa", label: "품질 보증", abbr: "QA", color: "border-green-200 bg-green-50" },
] as const;

interface ExpertCardsProps {
  expertSummary: string | null;
}

function safeParse(json: string | null): ExpertParsed | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as ExpertParsed;
  } catch {
    return null;
  }
}

export function ExpertCards({ expertSummary }: ExpertCardsProps) {
  const parsed = safeParse(expertSummary);

  if (!parsed && !expertSummary) {
    return (
      <div className="text-sm text-muted-foreground p-4 border rounded-lg">
        Expert 리뷰 결과가 없어요.
      </div>
    );
  }

  if (!parsed) {
    return (
      <div className="border rounded-lg p-4">
        <h4 className="text-sm font-semibold mb-2">Expert 리뷰</h4>
        <p className="text-sm whitespace-pre-wrap">{expertSummary}</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      <h4 className="text-sm font-semibold mb-3">Expert 리뷰 (5종)</h4>
      <div className="grid grid-cols-5 gap-3">
        {EXPERT_CONFIG.map(({ key, label, abbr, color }) => (
          <div key={key} className={`rounded-lg border-2 p-3 ${color}`}>
            <div className="text-xs font-bold mb-1">{abbr}</div>
            <div className="text-xs text-muted-foreground mb-1">{label}</div>
            <p className="text-xs">
              {parsed[key as keyof ExpertParsed] ?? "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
