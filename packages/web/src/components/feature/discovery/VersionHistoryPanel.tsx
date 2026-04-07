"use client";

/**
 * Sprint 215: 기획서 버전 이력 + diff (F444)
 */
import { useState, useEffect } from "react";
import { Clock, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchBusinessPlanVersions, fetchBusinessPlanDiff, type BpDiffResult } from "@/lib/api-client";

interface VersionHistoryPanelProps {
  bizItemId: string;
  currentVersion: number;
}

export default function VersionHistoryPanel({ bizItemId, currentVersion }: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Array<{ version: number; generatedAt: string }>>([]);
  const [diff, setDiff] = useState<BpDiffResult | null>(null);
  const [selectedV1, setSelectedV1] = useState<number | null>(null);
  const [selectedV2, setSelectedV2] = useState<number | null>(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchBusinessPlanVersions(bizItemId);
        setVersions(data);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [bizItemId]);

  const handleDiff = async () => {
    if (selectedV1 === null || selectedV2 === null) return;
    setIsLoadingDiff(true);
    try {
      const result = await fetchBusinessPlanDiff(bizItemId, selectedV1, selectedV2);
      setDiff(result);
    } finally {
      setIsLoadingDiff(false);
    }
  };

  const changedCount = diff?.sections.filter(s => s.changed).length ?? 0;

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2">
        <Clock className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold">버전 이력</span>
        <Badge variant="outline" className="text-xs">현재 v{currentVersion}</Badge>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">불러오는 중...</p>
      ) : versions.length === 0 ? (
        <p className="text-xs text-muted-foreground">버전 이력이 없어요.</p>
      ) : (
        <>
          {/* 버전 목록 */}
          <div className="space-y-1">
            {versions.slice(0, 5).map(v => (
              <div key={v.version} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">v{v.version}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(v.generatedAt).toLocaleDateString("ko", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSelectedV1(v.version)}
                    className={`text-xs px-2 py-0.5 rounded border ${selectedV1 === v.version ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                    aria-label={`v${v.version}을 기준 버전으로 선택`}
                  >
                    기준
                  </button>
                  <button
                    onClick={() => setSelectedV2(v.version)}
                    className={`text-xs px-2 py-0.5 rounded border ${selectedV2 === v.version ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}
                    aria-label={`v${v.version}을 비교 버전으로 선택`}
                  >
                    비교
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Diff 버튼 */}
          {selectedV1 !== null && selectedV2 !== null && selectedV1 !== selectedV2 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => void handleDiff()}
              disabled={isLoadingDiff}
            >
              <ArrowLeftRight className="size-3.5" />
              {isLoadingDiff ? "비교 중..." : `v${selectedV1} vs v${selectedV2} 비교`}
            </Button>
          )}

          {/* Diff 결과 */}
          {diff && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                변경된 섹션: <span className="font-medium text-foreground">{changedCount}</span>개
              </p>
              {diff.sections
                .filter(s => s.changed)
                .map(s => (
                  <div key={s.num} className="rounded border overflow-hidden text-xs">
                    <div className="px-3 py-1.5 bg-muted font-medium">§{s.num} {s.title}</div>
                    <div className="grid grid-cols-2 divide-x">
                      <div className="p-3 bg-red-50/40 dark:bg-red-950/20 text-muted-foreground whitespace-pre-wrap line-clamp-4">
                        {s.v1Content || <em className="italic">비어있음</em>}
                      </div>
                      <div className="p-3 bg-green-50/40 dark:bg-green-950/20 whitespace-pre-wrap line-clamp-4">
                        {s.v2Content || <em className="italic">비어있음</em>}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
