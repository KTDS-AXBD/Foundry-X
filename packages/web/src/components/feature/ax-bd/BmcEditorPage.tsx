"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchApi, putApi, postApi } from "@/lib/api-client";
import BmcBlockEditor from "./BmcBlockEditor";
import BmcStagingBar from "./BmcStagingBar";

// ─── 타입 ───
interface BmcBlock {
  blockType: string;
  content: string | null;
  updatedAt: number;
}

interface Bmc {
  id: string;
  ideaId: string | null;
  title: string;
  gitRef: string;
  authorId: string;
  orgId: string;
  syncStatus: "synced" | "pending" | "failed";
  blocks: BmcBlock[];
  createdAt: number;
  updatedAt: number;
}

// ─── 상수 ───
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

const BMC_GRID_LAYOUT = [
  { type: "key_partnerships",       row: 1, col: 1, rowSpan: 2, colSpan: 1 },
  { type: "key_activities",         row: 1, col: 2, rowSpan: 1, colSpan: 1 },
  { type: "key_resources",          row: 2, col: 2, rowSpan: 1, colSpan: 1 },
  { type: "value_propositions",     row: 1, col: 3, rowSpan: 2, colSpan: 1 },
  { type: "customer_relationships", row: 1, col: 4, rowSpan: 1, colSpan: 1 },
  { type: "channels",              row: 2, col: 4, rowSpan: 1, colSpan: 1 },
  { type: "customer_segments",     row: 1, col: 5, rowSpan: 2, colSpan: 1 },
  { type: "cost_structure",        row: 3, col: 1, rowSpan: 1, colSpan: 2 },
  { type: "revenue_streams",       row: 3, col: 3, rowSpan: 1, colSpan: 3 },
];

interface BmcEditorPageProps {
  bmcId?: string;
}

export default function BmcEditorPage({ bmcId }: BmcEditorPageProps) {
  const router = useRouter();
  const [bmc, setBmc] = useState<Bmc | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bmcId) return;
    fetchApi<Bmc>(`/ax-bd/bmc/${bmcId}`)
      .then(setBmc)
      .catch(() => setError("BMC를 불러오지 못했어요."));
  }, [bmcId]);

  const handleBlockChange = useCallback((blockType: string, content: string) => {
    setBmc((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.blockType === blockType ? { ...b, content } : b,
        ),
      };
    });
    setDirty(true);
  }, []);

  const handleSave = async () => {
    if (!bmc || !dirty) return;
    setSaving(true);
    try {
      const updated = await putApi<Bmc>(`/ax-bd/bmc/${bmc.id}`, {
        blocks: bmc.blocks.map((b) => ({
          blockType: b.blockType,
          content: b.content ?? "",
        })),
      });
      setBmc(updated);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    setCreating(true);
    try {
      const created = await postApi<Bmc>("/ax-bd/bmc", { title: trimmed });
      router.replace(`/ax-bd/bmc/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "BMC 생성에 실패했어요.");
      setCreating(false);
    }
  };

  // 새 BMC 생성 모드
  if (!bmcId) {
    return (
      <div className="mx-auto max-w-lg space-y-6 p-6">
        <h1 className="text-2xl font-bold">새 BMC 캔버스</h1>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-sm font-medium">제목</label>
            <input
              className="mt-1 w-full rounded border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="BMC 제목을 입력하세요"
              maxLength={100}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? "생성 중..." : "생성"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (error && !bmc) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!bmc) {
    return <div className="p-6 text-sm text-muted-foreground">로딩 중...</div>;
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{bmc.title}</h1>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
          {bmc.syncStatus === "synced" ? "동기화 완료" : bmc.syncStatus === "pending" ? "대기 중" : "실패"}
        </span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* BMC 캔버스 그리드 */}
      <div className="grid grid-cols-5 grid-rows-3 gap-2" style={{ minHeight: 600 }}>
        {BMC_GRID_LAYOUT.map(({ type, row, col, rowSpan, colSpan }) => (
          <div
            key={type}
            style={{
              gridRow: `${row} / span ${rowSpan}`,
              gridColumn: `${col} / span ${colSpan}`,
            }}
          >
            <BmcBlockEditor
              label={BMC_BLOCK_LABELS[type]}
              blockType={type}
              content={bmc.blocks.find((b) => b.blockType === type)?.content ?? ""}
              onChange={(content) => handleBlockChange(type, content)}
            />
          </div>
        ))}
      </div>

      <BmcStagingBar dirty={dirty} saving={saving} onSave={handleSave} />
    </div>
  );
}
