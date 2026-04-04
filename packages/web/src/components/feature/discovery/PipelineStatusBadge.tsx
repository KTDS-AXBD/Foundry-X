/**
 * F313: PipelineStatusBadge — 파이프라인 상태 컬러 뱃지
 */

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  idle: { label: "대기", color: "text-gray-700", bg: "bg-gray-100" },
  discovery_running: { label: "발굴 진행", color: "text-blue-700", bg: "bg-blue-100" },
  discovery_complete: { label: "발굴 완료", color: "text-emerald-700", bg: "bg-emerald-100" },
  shaping_queued: { label: "형상화 대기", color: "text-amber-700", bg: "bg-amber-100" },
  shaping_running: { label: "형상화 진행", color: "text-indigo-700", bg: "bg-indigo-100" },
  shaping_complete: { label: "완료", color: "text-green-700", bg: "bg-green-100" },
  paused: { label: "일시 중지", color: "text-yellow-700", bg: "bg-yellow-100" },
  failed: { label: "실패", color: "text-red-700", bg: "bg-red-100" },
  aborted: { label: "중단", color: "text-gray-500", bg: "bg-gray-200" },
};

interface Props {
  status: string;
  size?: "sm" | "md";
}

export function PipelineStatusBadge({ status, size = "sm" }: Props) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: "text-gray-700", bg: "bg-gray-100" };
  const sizeClass = size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1";

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.color} ${sizeClass}`}>
      {config.label}
    </span>
  );
}
