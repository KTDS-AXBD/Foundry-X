import { useState } from "react";
import type { GeneratedPrdEntry } from "../../lib/api-client";
import { confirmPrd } from "../../lib/api-client";

interface Props {
  prd: GeneratedPrdEntry;
  bizItemId: string;
  onConfirmed: (v3: GeneratedPrdEntry) => void;
  onClose: () => void;
}

export function PrdConfirmDialog({ prd, bizItemId, onConfirmed, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    setValidationErrors([]);
    try {
      const v3 = await confirmPrd(bizItemId, prd.id);
      onConfirmed(v3);
    } catch (e) {
      if (e instanceof Error) {
        // API 에러 body에 validation errors가 있을 수 있음
        try {
          const parsed = JSON.parse(e.message);
          if (parsed.errors) {
            setValidationErrors(parsed.errors as string[]);
            return;
          }
        } catch {
          /* ignore parse error */
        }
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, width: 480, padding: 32 }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>PRD 최종 확정</div>
        <div style={{ fontSize: 14, color: "#475569", marginBottom: 20, lineHeight: 1.6 }}>
          이 2차 PRD를 최종 확정하시겠어요?<br />
          확정 시 3차 PRD(confirmed)가 생성되며, 이후 Prototype Builder의 입력으로 사용돼요.
        </div>

        {validationErrors.length > 0 && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, color: "#991b1b", marginBottom: 8 }}>검증 실패</div>
            <ul style={{ margin: 0, paddingLeft: 20, color: "#7f1d1d", fontSize: 13 }}>
              {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {error && (
          <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #cbd5e1", cursor: "pointer" }}>
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: loading ? "#93c5fd" : "#2563eb", color: "#fff", cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "확정 중…" : "확정하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
