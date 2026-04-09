import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { listPrds, type GeneratedPrdEntry } from "../lib/api-client";
import { PrdVersionList } from "../components/prd/PrdVersionList";
import { PrdDetailView } from "../components/prd/PrdDetailView";
import { PrdEditor } from "../components/prd/PrdEditor";
import { PrdDiffView } from "../components/prd/PrdDiffView";
import { PrdConfirmDialog } from "../components/prd/PrdConfirmDialog";

type Modal = "detail" | "edit" | "diff" | "confirm";

export function Component() {
  const { bizItemId = "" } = useParams<{ bizItemId: string }>();
  const navigate = useNavigate();
  const [prds, setPrds] = useState<GeneratedPrdEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [activePrd, setActivePrd] = useState<GeneratedPrdEntry | null>(null);

  useEffect(() => {
    if (!bizItemId) return;
    setLoading(true);
    listPrds(bizItemId)
      .then((r) => setPrds(r.prds))
      .catch((e) => setError(e instanceof Error ? e.message : "로드 실패"))
      .finally(() => setLoading(false));
  }, [bizItemId]);

  const refresh = () => {
    listPrds(bizItemId).then((r) => setPrds(r.prds)).catch(() => null);
  };

  const openModal = (m: Modal, prd?: GeneratedPrdEntry) => {
    setActivePrd(prd ?? null);
    setModal(m);
  };

  const closeModal = () => {
    setModal(null);
    setActivePrd(null);
  };

  return (
    <div className="mx-auto max-w-[1200px] p-8 text-foreground">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-[13px] text-muted-foreground">
        <button
          onClick={() => navigate(-1)}
          className="cursor-pointer border-none bg-transparent text-muted-foreground hover:text-foreground"
        >
          ← 뒤로
        </button>
        <span>/</span>
        <span>PRD 관리</span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="m-0 text-[22px] font-bold">PRD 버전 관리</h2>
        {prds.length >= 2 && (
          <button
            onClick={() => openModal("diff")}
            className="cursor-pointer rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-muted/40"
          >
            버전 비교
          </button>
        )}
      </div>

      {loading && <div className="text-muted-foreground">불러오는 중…</div>}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
          PRD 로드 실패: {error}
        </div>
      )}

      {!loading && !error && prds.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-muted-foreground">
          아직 생성된 PRD가 없어요. 발굴 과정에서 PRD가 생성되면 여기에 표시돼요.
        </div>
      )}

      {!loading && !error && prds.length > 0 && (
        <PrdVersionList
          prds={prds}
          bizItemId={bizItemId}
          onView={(prd) => openModal("detail", prd)}
          onEdit={(prd) => openModal("edit", prd)}
          onConfirm={(prd) => openModal("confirm", prd)}
        />
      )}

      {/* Modals */}
      {modal === "detail" && activePrd && (
        <PrdDetailView
          prd={activePrd}
          onEdit={() => openModal("edit", activePrd)}
          onConfirm={activePrd.version === 2 ? () => openModal("confirm", activePrd) : undefined}
          onCompare={() => openModal("diff")}
          onClose={closeModal}
        />
      )}

      {modal === "edit" && activePrd && (
        <PrdEditor
          prd={activePrd}
          bizItemId={bizItemId}
          onSaved={(updated) => {
            setPrds((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setActivePrd(updated);
          }}
          onClose={closeModal}
        />
      )}

      {modal === "diff" && (
        <PrdDiffView prds={prds} bizItemId={bizItemId} onClose={closeModal} />
      )}

      {modal === "confirm" && activePrd && (
        <PrdConfirmDialog
          prd={activePrd}
          bizItemId={bizItemId}
          onConfirmed={(v3) => {
            refresh();
            closeModal();
            // v3 상세 바로 열기
            setActivePrd(v3);
            setModal("detail");
          }}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
