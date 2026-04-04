/**
 * F315: PipelinePermissionEditor — 파이프라인 승인 권한 설정 UI
 */
import { useState, useEffect, useCallback } from "react";
import { fetchApi, putApi } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

interface Permission {
  id: string;
  pipelineRunId: string;
  userId: string | null;
  minRole: string;
  canApprove: boolean;
  canAbort: boolean;
  grantedBy: string;
  createdAt: string;
}

interface Props {
  runId: string;
  isAdmin: boolean;
}

const ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer" },
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
];

export function PipelinePermissionEditor({ runId, isAdmin }: Props) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [minRole, setMinRole] = useState("member");
  const [canAbort, setCanAbort] = useState(false);

  const load = useCallback(async () => {
    const result = await fetchApi<{ permissions: Permission[] }>(
      `/discovery-pipeline/runs/${runId}/permissions`,
    );
    setPermissions(result.permissions);
  }, [runId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async () => {
    await putApi(`/discovery-pipeline/runs/${runId}/permissions`, {
      minRole,
      canApprove: true,
      canAbort,
    });
    await load();
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700">승인 권한 설정</h4>

      {/* 현재 권한 목록 */}
      <div className="space-y-1">
        {permissions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            설정된 권한이 없어요. 기본 정책: admin 이상 승인 가능
          </p>
        ) : (
          permissions.map((perm) => (
            <div
              key={perm.id}
              className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs"
            >
              <span>
                {perm.userId ? `사용자 ${perm.userId.slice(0, 8)}...` : `역할 ≥ ${perm.minRole}`}
              </span>
              <div className="flex gap-2">
                {perm.canApprove && (
                  <span className="text-green-600">승인</span>
                )}
                {perm.canAbort && (
                  <span className="text-red-600">중단</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 권한 추가 (admin만) */}
      {isAdmin && (
        <div className="flex items-center gap-2 pt-2 border-t">
          <select
            value={minRole}
            onChange={(e) => setMinRole(e.target.value)}
            className="text-xs border rounded px-2 py-1"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} 이상
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={canAbort}
              onChange={(e) => setCanAbort(e.target.checked)}
            />
            중단 권한
          </label>
          <Button size="sm" variant="outline" onClick={handleAdd}>
            추가
          </Button>
        </div>
      )}
    </div>
  );
}
