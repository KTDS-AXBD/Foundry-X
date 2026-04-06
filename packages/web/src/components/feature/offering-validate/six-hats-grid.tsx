/**
 * F377: Six Hats Grid — 6색 모자 카드 그리드 (Sprint 170)
 */

interface SixHatsParsed {
  white?: string;
  red?: string;
  black?: string;
  yellow?: string;
  green?: string;
  blue?: string;
}

const HAT_CONFIG = [
  { key: "white", label: "흰색 — 사실/데이터", color: "border-gray-300 bg-gray-50", icon: "⚪" },
  { key: "red", label: "빨강 — 감정/직관", color: "border-red-300 bg-red-50", icon: "🔴" },
  { key: "black", label: "검정 — 비판/리스크", color: "border-gray-600 bg-gray-100", icon: "⚫" },
  { key: "yellow", label: "노랑 — 낙관/이점", color: "border-yellow-300 bg-yellow-50", icon: "🟡" },
  { key: "green", label: "초록 — 창의/대안", color: "border-green-300 bg-green-50", icon: "🟢" },
  { key: "blue", label: "파랑 — 관리/프로세스", color: "border-blue-300 bg-blue-50", icon: "🔵" },
] as const;

interface SixHatsGridProps {
  sixhatsSummary: string | null;
}

function safeParse(json: string | null): SixHatsParsed | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as SixHatsParsed;
  } catch {
    return null;
  }
}

export function SixHatsGrid({ sixhatsSummary }: SixHatsGridProps) {
  const parsed = safeParse(sixhatsSummary);

  if (!parsed && !sixhatsSummary) {
    return (
      <div className="text-sm text-muted-foreground p-4 border rounded-lg">
        Six Hats 분석 결과가 없어요.
      </div>
    );
  }

  if (!parsed) {
    return (
      <div className="border rounded-lg p-4">
        <h4 className="text-sm font-semibold mb-2">Six Hats 분석</h4>
        <p className="text-sm whitespace-pre-wrap">{sixhatsSummary}</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4">
      <h4 className="text-sm font-semibold mb-3">Six Hats 분석</h4>
      <div className="grid grid-cols-3 gap-3">
        {HAT_CONFIG.map(({ key, label, color, icon }) => (
          <div key={key} className={`rounded-lg border-2 p-3 ${color}`}>
            <div className="text-sm font-medium mb-1">
              {icon} {label}
            </div>
            <p className="text-xs text-muted-foreground">
              {parsed[key as keyof SixHatsParsed] ?? "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
