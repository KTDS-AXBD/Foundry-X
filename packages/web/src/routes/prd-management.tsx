import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  listPrds,
  fetchBizItemDetail,
  generatePrdFromBp,
  type GeneratedPrdEntry,
  type BizItemDetail,
} from "../lib/api-client";
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
  const [item, setItem] = useState<BizItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [activePrd, setActivePrd] = useState<GeneratedPrdEntry | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    if (!bizItemId) return;
    setLoading(true);
    Promise.all([
      listPrds(bizItemId).then((r) => r.prds),
      fetchBizItemDetail(bizItemId).catch(() => null),
    ])
      .then(([prdList, detail]) => {
        setPrds(prdList);
        setItem(detail);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "로드 실패"))
      .finally(() => setLoading(false));
  }, [bizItemId]);

  const refresh = () => {
    listPrds(bizItemId).then((r) => setPrds(r.prds)).catch(() => null);
  };

  const handleGeneratePrd = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      await generatePrdFromBp(bizItemId);
      const r = await listPrds(bizItemId);
      setPrds(r.prds);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "PRD 생성 실패";
      setGenerateError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const isDraft = item?.status === "draft" || item?.status === "registered";

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
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
          <div className="mb-2 text-lg font-semibold text-foreground">
            아직 생성된 PRD가 없어요
          </div>

          {isDraft ? (
            <>
              <p className="mx-auto mb-5 max-w-md text-sm text-muted-foreground">
                먼저 아이템 분석을 완료해야 PRD를 생성할 수 있어요.
                분석을 통해 사업기획서가 만들어지면, 그 내용을 바탕으로 PRD가 자동 생성돼요.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Link
                  to={`/discovery/items/${bizItemId}`}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  분석 시작하기 →
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mx-auto mb-5 max-w-md text-sm text-muted-foreground">
                이 아이템의 사업기획서를 기반으로 1차 PRD를 생성할 수 있어요.
                생성 후 인터뷰를 통해 2차 PRD로 발전시키고, 최종적으로 3차 PRD로 확정할 수 있어요.
              </p>
              {generateError && (
                <div className="mx-auto mb-4 max-w-md rounded-md border border-destructive/30 bg-destructive/10 p-3 text-[13px] text-destructive">
                  PRD 생성 실패: {generateError}
                </div>
              )}
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={handleGeneratePrd}
                  disabled={generating}
                  className="cursor-pointer rounded-md border-none bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? "생성 중…" : "PRD 생성하기"}
                </button>
                <Link
                  to={`/discovery/items/${bizItemId}`}
                  className="rounded-md border border-border bg-background px-4 py-2 text-sm text-foreground hover:bg-muted/40"
                >
                  아이템 상세 보기
                </Link>
              </div>
            </>
          )}
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
