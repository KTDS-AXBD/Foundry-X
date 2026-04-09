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

  // prd 파라미터는 현재 텍스트에 직접 노출되진 않지만, 향후 metadata 표시용 예약
  void prd;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="w-[480px] rounded-2xl border border-border bg-card p-8 text-foreground shadow-xl">
        <div className="mb-3 text-lg font-bold">PRD 최종 확정</div>
        <div className="mb-5 text-sm leading-relaxed text-muted-foreground">
          이 2차 PRD를 최종 확정하시겠어요?
          <br />
          확정 시 3차 PRD(confirmed)가 생성되며, 이후 Prototype Builder의 입력으로 사용돼요.
        </div>

        {validationErrors.length > 0 && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <div className="mb-2 font-semibold text-destructive">검증 실패</div>
            <ul className="m-0 list-disc pl-5 text-[13px] text-destructive/90">
              {validationErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        {error && <div className="mb-3 text-[13px] text-destructive">{error}</div>}

        <div className="flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-border bg-background px-5 py-2 text-sm text-foreground hover:bg-muted/40"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="cursor-pointer rounded-lg border-none bg-primary px-5 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "확정 중…" : "확정하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
