"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchApi, postApi } from "@/lib/api-client";

interface BmcVersion {
  id: string;
  bmcId: string;
  commitSha: string;
  authorId: string;
  message: string;
  createdAt: string;
}

interface BmcSnapshot {
  version: BmcVersion;
  blocks: Record<string, string | null>;
}

interface BmcVersionHistoryProps {
  bmcId: string;
  onRestore?: (blocks: Record<string, string | null>) => void;
}

const BMC_BLOCK_LABELS: Record<string, string> = {
  key_partnerships: "핵심 파트너십",
  key_activities: "핵심 활동",
  key_resources: "핵심 자원",
  value_propositions: "가치 제안",
  customer_relationships: "고객 관계",
  channels: "채널",
  customer_segments: "고객 세그먼트",
  cost_structure: "비용 구조",
  revenue_streams: "수익 구조",
};

export default function BmcVersionHistory({ bmcId, onRestore }: BmcVersionHistoryProps) {
  const [versions, setVersions] = useState<BmcVersion[]>([]);
  const [selected, setSelected] = useState<BmcSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [confirmSha, setConfirmSha] = useState<string | null>(null);

  useEffect(() => {
    fetchApi<{ versions: BmcVersion[] }>(`/ax-bd/bmc/${bmcId}/history`)
      .then((data) => setVersions(data.versions))
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [bmcId]);

  const handleSelect = useCallback(async (sha: string) => {
    const snapshot = await fetchApi<BmcSnapshot>(`/ax-bd/bmc/${bmcId}/history/${sha}`);
    setSelected(snapshot);
  }, [bmcId]);

  const handleRestore = useCallback(async (sha: string) => {
    setRestoring(true);
    try {
      const data = await postApi<{ restored: BmcSnapshot }>(`/ax-bd/bmc/${bmcId}/history/${sha}/restore`);
      onRestore?.(data.restored.blocks);
      setConfirmSha(null);
    } finally {
      setRestoring(false);
    }
  }, [bmcId, onRestore]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">버전 히스토리 로딩 중...</p>;
  }

  if (versions.length === 0) {
    return (
      <div className="rounded border border-dashed border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">아직 저장된 버전이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        {/* 버전 목록 */}
        <div className="w-1/3 space-y-1">
          {versions.map((v) => (
            <button
              key={v.id}
              onClick={() => handleSelect(v.commitSha)}
              className={`w-full rounded border px-3 py-2 text-left text-sm transition-colors ${
                selected?.version.commitSha === v.commitSha
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted"
              }`}
            >
              <div className="font-medium">{v.message || "(메시지 없음)"}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(v.createdAt).toLocaleString("ko-KR")} · {v.commitSha.slice(0, 7)}
              </div>
            </button>
          ))}
        </div>

        {/* 스냅샷 미리보기 */}
        <div className="flex-1">
          {selected ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  버전: {selected.version.commitSha.slice(0, 7)}
                </h3>
                {confirmSha === selected.version.commitSha ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRestore(selected.version.commitSha)}
                      disabled={restoring}
                      className="rounded bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {restoring ? "복원 중..." : "확인"}
                    </button>
                    <button
                      onClick={() => setConfirmSha(null)}
                      className="rounded border border-border px-3 py-1 text-xs hover:bg-muted"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmSha(selected.version.commitSha)}
                    className="rounded border border-border px-3 py-1 text-xs hover:bg-muted"
                  >
                    이 버전으로 복원
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(selected.blocks).map(([key, value]) => (
                  <div key={key} className="rounded border border-border p-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      {BMC_BLOCK_LABELS[key] ?? key}
                    </div>
                    <p className="mt-1 text-sm">{value || "-"}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              왼쪽에서 버전을 선택하세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
