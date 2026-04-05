"use client";

import { useEffect, useState, useCallback } from "react";
import { listBackups, exportBackup, importBackup, deleteBackup } from "@/lib/api-client";
import type { BackupMeta, ImportResult } from "@/lib/api-client";
import { useOrgStore } from "@/lib/stores/org-store";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 2);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function BackupTypeTag({ type }: { type: string }) {
  const colors: Record<string, string> = {
    manual: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    auto: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    pre_deploy: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colors[type] || ""}`}>
      {type}
    </span>
  );
}

export function Component() {
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [filterType, setFilterType] = useState<string>("");
  const { activeOrgId } = useOrgStore();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listBackups({
        backupType: filterType || undefined,
        limit: 20,
      });
      setBackups(res.items);
      setTotal(res.total);
    } catch {
      // API error handled silently
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    if (activeOrgId) load();
  }, [activeOrgId, load]);

  const handleExport = async (scope: "full" | "item") => {
    setExporting(true);
    try {
      await exportBackup({ scope });
      await load();
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (backupId: string) => {
    try {
      const result = await importBackup({ backupId, strategy: "merge" });
      setImportResult(result);
    } catch {
      // error handled
    }
  };

  const handleDelete = async (id: string) => {
    await deleteBackup(id);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">백업 관리</h1>
          <p className="text-sm text-muted-foreground">
            Discovery 파이프라인 데이터 백업 및 복구 ({total}건)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("full")}
            disabled={exporting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {exporting ? "백업 중..." : "전체 백업"}
          </button>
        </div>
      </div>

      {/* Import Result Banner */}
      {importResult && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            복원 완료 — {importResult.inserted}건 추가, {importResult.skipped}건 건너뜀
          </p>
          <button
            onClick={() => setImportResult(null)}
            className="mt-1 text-xs text-green-600 underline dark:text-green-400"
          >
            닫기
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {["", "manual", "auto", "pre_deploy"].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`rounded-md px-3 py-1 text-sm ${
              filterType === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {t || "전체"}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">로딩 중...</div>
      ) : backups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          백업이 없어요. 첫 번째 백업을 생성해보세요.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">유형</th>
                <th className="px-4 py-3 text-left font-medium">범위</th>
                <th className="px-4 py-3 text-right font-medium">항목 수</th>
                <th className="px-4 py-3 text-right font-medium">크기</th>
                <th className="px-4 py-3 text-left font-medium">생성자</th>
                <th className="px-4 py-3 text-left font-medium">생성일</th>
                <th className="px-4 py-3 text-right font-medium">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {backups.map((b) => (
                <tr key={b.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <BackupTypeTag type={b.backupType} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {b.scope === "full" ? "전체" : b.bizItemId?.slice(0, 8) || "아이템"}
                  </td>
                  <td className="px-4 py-3 text-right">{b.itemCount}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatBytes(b.sizeBytes)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {b.createdBy === "system:cron" ? "자동" : b.createdBy.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(b.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleImport(b.id)}
                        className="rounded px-2 py-1 text-xs text-primary hover:bg-primary/10"
                      >
                        복원
                      </button>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="rounded px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
