/**
 * F441: 파일 업로드 존 컴포넌트 (Sprint 213)
 * R2 Presigned URL을 통한 drag-and-drop 파일 업로드
 */
import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react";

const ACCEPTED_MIMES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

type UploadStatus = "idle" | "uploading" | "parsing" | "done" | "error";

interface FileUploadZoneProps {
  apiBaseUrl?: string;
  bizItemId?: string;
  onUploadComplete?: (fileId: string) => void;
}

export function FileUploadZone({ apiBaseUrl = "", bizItemId, onUploadComplete }: FileUploadZoneProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [filename, setFilename] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("fx_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const upload = useCallback(async (file: File) => {
    if (!ACCEPTED_MIMES[file.type]) {
      setStatus("error");
      setErrorMsg("PDF, PPTX, DOCX 파일만 업로드할 수 있어요");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setStatus("error");
      setErrorMsg("파일 크기는 50MB를 초과할 수 없어요");
      return;
    }

    setFilename(file.name);
    setStatus("uploading");
    setProgress(0);
    setErrorMsg("");

    try {
      // Step 1: Presigned URL 발급
      const presignRes = await fetch(`${apiBaseUrl}/api/files/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          filename: file.name,
          mime_type: file.type,
          biz_item_id: bizItemId,
          size_bytes: file.size,
        }),
      });

      if (!presignRes.ok) {
        throw new Error("Presigned URL 발급에 실패했어요");
      }
      const { presigned_url, file_id } = await presignRes.json<{
        presigned_url: string;
        file_id: string;
      }>();

      // Step 2: R2에 직접 PUT (XMLHttpRequest로 진행바 지원)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presigned_url);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 90));
        };
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error("R2 업로드 실패")));
        xhr.onerror = () => reject(new Error("네트워크 오류"));
        xhr.send(file);
      });

      setProgress(90);

      // Step 3: 업로드 확인
      const confirmRes = await fetch(`${apiBaseUrl}/api/files/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ file_id }),
      });

      if (!confirmRes.ok) throw new Error("업로드 확인에 실패했어요");

      // Step 4: 파싱 트리거
      setStatus("parsing");
      const parseRes = await fetch(`${apiBaseUrl}/api/files/${file_id}/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      });

      if (!parseRes.ok) {
        // 파싱 실패는 치명적이지 않음 — 업로드 자체는 성공
        console.warn("파싱 실패:", await parseRes.text());
      }

      setProgress(100);
      setStatus("done");
      onUploadComplete?.(file_id);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "업로드에 실패했어요");
    }
  }, [apiBaseUrl, bizItemId, onUploadComplete]);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
  };

  const reset = () => {
    setStatus("idle");
    setProgress(0);
    setFilename("");
    setErrorMsg("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      data-testid="file-upload-zone"
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => status === "idle" && inputRef.current?.click()}
      style={{
        border: `2px dashed ${isDragging ? "#3b82f6" : status === "error" ? "#ef4444" : "#d1d5db"}`,
        borderRadius: "8px",
        padding: "24px",
        textAlign: "center",
        cursor: status === "idle" ? "pointer" : "default",
        background: isDragging ? "#eff6ff" : "transparent",
        transition: "all 0.15s",
        minHeight: "120px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
      }}
      aria-label="파일 업로드 영역"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.pptx,.docx"
        onChange={handleChange}
        style={{ display: "none" }}
        aria-hidden="true"
      />

      {status === "idle" && (
        <>
          <span style={{ fontSize: "32px" }}>📄</span>
          <p style={{ margin: 0, fontWeight: 500, color: "#374151" }}>
            PDF, PPTX, DOCX 파일을 드래그하거나 클릭해서 업로드하세요
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>최대 50MB</p>
        </>
      )}

      {(status === "uploading" || status === "parsing") && (
        <>
          <p style={{ margin: 0, fontWeight: 500, color: "#374151" }}>
            {status === "uploading" ? `${filename} 업로드 중...` : "텍스트 추출 중..."}
          </p>
          <div
            style={{
              width: "100%",
              height: "8px",
              background: "#e5e7eb",
              borderRadius: "4px",
              overflow: "hidden",
            }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "#3b82f6",
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>{progress}%</p>
        </>
      )}

      {status === "done" && (
        <>
          <span style={{ fontSize: "32px" }}>✅</span>
          <p style={{ margin: 0, fontWeight: 500, color: "#059669" }}>{filename} 업로드 완료</p>
          <button
            onClick={(e) => { e.stopPropagation(); reset(); }}
            style={{
              marginTop: "4px",
              padding: "4px 12px",
              fontSize: "12px",
              background: "none",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            다른 파일 업로드
          </button>
        </>
      )}

      {status === "error" && (
        <>
          <span style={{ fontSize: "32px" }}>❌</span>
          <p style={{ margin: 0, fontWeight: 500, color: "#ef4444" }}>{errorMsg}</p>
          <button
            onClick={(e) => { e.stopPropagation(); reset(); }}
            style={{
              marginTop: "4px",
              padding: "4px 12px",
              fontSize: "12px",
              background: "none",
              border: "1px solid #ef4444",
              color: "#ef4444",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </>
      )}
    </div>
  );
}
