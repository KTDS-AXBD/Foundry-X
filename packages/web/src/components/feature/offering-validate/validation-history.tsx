/**
 * F377: Validation History — 검증 히스토리 테이블 (Sprint 170)
 */
import type { OfferingValidationItem } from "@/lib/api-client";

interface ValidationHistoryProps {
  validations: OfferingValidationItem[];
  onSelect: (v: OfferingValidationItem) => void;
  selectedId: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  passed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  running: "bg-yellow-100 text-yellow-700",
  error: "bg-gray-100 text-gray-700",
};

export function ValidationHistory({ validations, onSelect, selectedId }: ValidationHistoryProps) {
  if (validations.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 border rounded-lg">
        검증 히스토리가 없어요. "검증 시작" 버튼을 눌러 첫 번째 검증을 실행하세요.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">#</th>
            <th className="px-4 py-2 text-left font-medium">날짜</th>
            <th className="px-4 py-2 text-left font-medium">모드</th>
            <th className="px-4 py-2 text-left font-medium">상태</th>
            <th className="px-4 py-2 text-left font-medium">종합 점수</th>
            <th className="px-4 py-2 text-left font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {validations.map((v, i) => (
            <tr
              key={v.id}
              className={`border-t cursor-pointer hover:bg-muted/30 ${
                selectedId === v.id ? "bg-primary/5" : ""
              }`}
              onClick={() => onSelect(v)}
            >
              <td className="px-4 py-2">{validations.length - i}</td>
              <td className="px-4 py-2">
                {new Date(v.createdAt).toLocaleDateString("ko")}
              </td>
              <td className="px-4 py-2">{v.mode}</td>
              <td className="px-4 py-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[v.status] ?? ""}`}>
                  {v.status}
                </span>
              </td>
              <td className="px-4 py-2">
                {v.overallScore != null ? `${Math.round(v.overallScore * 100)}%` : "—"}
              </td>
              <td className="px-4 py-2 text-primary text-xs">상세</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
