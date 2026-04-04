/**
 * F315: CheckpointApproverInfo — 체크포인트 승인자 정보 + 이력 표시
 */

interface AuditEntry {
  stepId: string;
  status: string;
  decidedBy: string | null;
  decidedAt: string | null;
  approverRole: string | null;
}

interface Props {
  checkpoint: {
    status: string;
    decidedBy: string | null;
    decidedAt: string | null;
    deadline: string | null;
  };
  /** 승인 이력 (audit-log API 응답) */
  auditLog?: AuditEntry[];
  /** 현재 사용자가 승인 권한이 있는지 */
  canApprove?: boolean;
}

function formatRelativeTime(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  const hours = Math.floor(Math.abs(diff) / 3600000);
  if (diff > 0) {
    return hours > 0 ? `${hours}시간 남음` : "곧 만료";
  }
  return "만료됨";
}

export function CheckpointApproverInfo({ checkpoint, auditLog, canApprove }: Props) {
  const isPending = checkpoint.status === "pending";
  const isApproved = checkpoint.status === "approved";
  const isRejected = checkpoint.status === "rejected";

  return (
    <div className="space-y-2 text-xs">
      {/* 현재 상태 */}
      {isPending && (
        <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
          <span className="animate-pulse text-yellow-500">●</span>
          <div>
            <p className="font-medium text-yellow-800">승인 대기 중</p>
            {checkpoint.deadline && (
              <p className="text-yellow-600">
                마감: {formatRelativeTime(checkpoint.deadline)}
              </p>
            )}
            {canApprove === false && (
              <p className="text-yellow-600 mt-1">
                승인 권한이 없어요. admin 이상의 역할이 필요해요.
              </p>
            )}
          </div>
        </div>
      )}

      {isApproved && checkpoint.decidedBy && (
        <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
          <span className="text-green-500">✓</span>
          <div>
            <p className="font-medium text-green-800">승인됨</p>
            <p className="text-green-600">
              {checkpoint.decidedBy.slice(0, 8)}... ·{" "}
              {checkpoint.decidedAt
                ? new Date(checkpoint.decidedAt).toLocaleString("ko-KR")
                : ""}
            </p>
          </div>
        </div>
      )}

      {isRejected && checkpoint.decidedBy && (
        <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
          <span className="text-red-500">✗</span>
          <div>
            <p className="font-medium text-red-800">거부됨</p>
            <p className="text-red-600">
              {checkpoint.decidedBy.slice(0, 8)}... ·{" "}
              {checkpoint.decidedAt
                ? new Date(checkpoint.decidedAt).toLocaleString("ko-KR")
                : ""}
            </p>
          </div>
        </div>
      )}

      {/* 승인 이력 */}
      {auditLog && auditLog.length > 0 && (
        <div className="mt-2">
          <p className="font-medium text-gray-600 mb-1">결정 이력</p>
          <div className="space-y-1">
            {auditLog.map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-muted-foreground">
                <span>
                  {entry.stepId} — {entry.status}
                  {entry.approverRole && (
                    <span className="ml-1 text-gray-400">({entry.approverRole})</span>
                  )}
                </span>
                <span>
                  {entry.decidedAt
                    ? new Date(entry.decidedAt).toLocaleDateString("ko-KR")
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
