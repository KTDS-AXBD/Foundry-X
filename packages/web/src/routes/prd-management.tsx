import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { listPrds, type GeneratedPrdEntry } from "../lib/api-client";
import { PrdVersionList } from "../components/prd/PrdVersionList";
import { PrdDetailView } from "../components/prd/PrdDetailView";
import { PrdEditor } from "../components/prd/PrdEditor";
import { PrdDiffView } from "../components/prd/PrdDiffView";
import { PrdConfirmDialog } from "../components/prd/PrdConfirmDialog";

type Modal = "detail" | "edit" | "diff" | "confirm";

export default function PrdManagement() {
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
    <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto" }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: 13, color: "#94a3b8" }}>
        <button onClick={() => navigate(-1)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}>
          ← 뒤로
        </button>
        <span>/</span>
        <span>PRD 관리</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, fontSize: 22, margin: 0 }}>PRD 버전 관리</h2>
        {prds.length >= 2 && (
          <button
            onClick={() => openModal("diff")}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #cbd5e1", cursor: "pointer" }}
          >
            버전 비교
          </button>
        )}
      </div>

      {loading && <div style={{ color: "#94a3b8" }}>불러오는 중…</div>}
      {error && <div style={{ color: "#ef4444" }}>{error}</div>}

      {!loading && !error && (
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
