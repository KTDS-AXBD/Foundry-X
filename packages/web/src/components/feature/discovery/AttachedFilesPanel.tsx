"use client";

/**
 * F443: 첨부 자료 패널 (Sprint 214)
 * 아이템 상세 페이지에서 업로드된 파일 목록과 파싱 상태를 표시한다.
 */
import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, FileText, RefreshCw } from "lucide-react";
import { fetchFiles, deleteFile, type UploadedFileMeta } from "@/lib/api-client";
import { FileUploadZone } from "@/components/feature/FileUploadZone";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  pending: { label: "대기", variant: "secondary" },
  uploaded: { label: "업로드 완료", variant: "secondary" },
  parsing: { label: "파싱 중", variant: "default" },
  parsed: { label: "파싱 완료", variant: "default" },
  error: { label: "오류", variant: "destructive" },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

interface AttachedFilesPanelProps {
  bizItemId: string;
}

export default function AttachedFilesPanel({ bizItemId }: AttachedFilesPanelProps) {
  const [files, setFiles] = useState<UploadedFileMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFiles(bizItemId);
      setFiles(result);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [bizItemId]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  async function handleDelete(fileId: string) {
    setDeletingId(fileId);
    try {
      await deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch {
      // fail silently
    } finally {
      setDeletingId(null);
    }
  }

  function handleUploadComplete(fileId: string) {
    // 업로드 완료 후 목록 새로고침
    void loadFiles();
    // 파싱이 끝나면 다시 새로고침 (3초 후)
    setTimeout(() => void loadFiles(), 3000);
    void fileId;
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">첨부 자료</h3>
          <p className="text-xs text-muted-foreground">
            PDF, PPTX, DOCX 파일을 업로드하면 발굴 분석에 자동으로 활용돼요
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void loadFiles()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUpload((v) => !v)}
          >
            {showUpload ? "닫기" : "+ 파일 추가"}
          </Button>
        </div>
      </div>

      {/* 업로드 존 (토글) */}
      {showUpload && (
        <div className="rounded-lg border p-3">
          <FileUploadZone
            bizItemId={bizItemId}
            onUploadComplete={(id) => {
              handleUploadComplete(id);
              setShowUpload(false);
            }}
          />
        </div>
      )}

      {/* 파일 목록 */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span className="text-sm">불러오는 중...</span>
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">첨부된 자료가 없어요</p>
          <p className="mt-1 text-xs text-muted-foreground">
            파일을 업로드하면 AI가 발굴 분석에 활용해요
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setShowUpload(true)}
          >
            + 파일 업로드
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => {
            const statusInfo = STATUS_LABELS[file.status] ?? { label: file.status, variant: "secondary" as const };
            return (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3"
              >
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{file.filename}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatBytes(file.size_bytes)}</span>
                    {file.page_count != null && (
                      <span>· {file.page_count}페이지</span>
                    )}
                  </div>
                </div>
                <Badge variant={statusInfo.variant} className="shrink-0 text-[10px]">
                  {statusInfo.label}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => void handleDelete(file.id)}
                  disabled={deletingId === file.id}
                  aria-label={`${file.filename} 삭제`}
                >
                  {deletingId === file.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            );
          })}
          <p className="text-right text-xs text-muted-foreground">
            총 {files.length}개 · 파싱 완료 {files.filter((f) => f.status === "parsed").length}개
          </p>
        </div>
      )}
    </div>
  );
}
