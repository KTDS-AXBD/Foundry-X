"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, Printer, FileText } from "lucide-react";
import { fetchOfferingBriefs, createOfferingBrief, fetchOfferingDetail, type OfferingBrief, type OfferingDetail } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";

const MEETING_LABELS: Record<string, string> = {
  initial: "초도 미팅",
  followup: "후속 미팅",
  demo: "데모 미팅",
  closing: "클로징",
};

export function Component() {
  const { id } = useParams<{ id: string }>();
  const [pack, setPack] = useState<OfferingDetail | null>(null);
  const [briefs, setBriefs] = useState<OfferingBrief[]>([]);
  const [selectedBrief, setSelectedBrief] = useState<OfferingBrief | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [packData, briefsData] = await Promise.all([
        fetchOfferingDetail(id),
        fetchOfferingBriefs(id),
      ]);
      setPack(packData);
      setBriefs(briefsData);
      if (briefsData.length > 0 && !selectedBrief) {
        setSelectedBrief(briefsData[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [id, selectedBrief]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!id) return;
    setCreating(true);
    try {
      const brief = await createOfferingBrief(id);
      setBriefs((prev) => [brief, ...prev]);
      setSelectedBrief(brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create brief");
    } finally {
      setCreating(false);
    }
  };

  if (error) return <div className="p-8 text-destructive">{error}</div>;
  if (!pack) return <div className="p-8 text-muted-foreground">로딩 중...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/shaping/offering/${id}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-2xl font-bold">{pack.title} — 미팅 브리프</h1>
          <Badge>{pack.status}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {selectedBrief && (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              <Printer className="size-4" /> 인쇄
            </button>
          )}
          <button
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="size-4" /> {creating ? "생성 중..." : "브리프 생성"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Brief list sidebar */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">브리프 목록 ({briefs.length})</h2>
          {briefs.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 생성된 브리프가 없어요.</p>
          ) : (
            briefs.map((b) => (
              <button
                key={b.id}
                onClick={() => setSelectedBrief(b)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  selectedBrief?.id === b.id ? "border-primary bg-primary/5" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">{b.title}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">{MEETING_LABELS[b.meetingType] ?? b.meetingType}</Badge>
                  <span>{new Date(b.createdAt).toLocaleDateString("ko")}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Brief content */}
        <div className="min-w-0">
          {selectedBrief ? (
            <div className="rounded-lg border p-6 print:border-0 print:p-0">
              <div className="prose prose-sm max-w-none dark:prose-invert print:prose-print">
                <div className="mb-4 flex items-center gap-2 print:hidden">
                  <Badge>{MEETING_LABELS[selectedBrief.meetingType] ?? selectedBrief.meetingType}</Badge>
                  {selectedBrief.targetAudience && (
                    <Badge variant="outline">대상: {selectedBrief.targetAudience}</Badge>
                  )}
                </div>
                {/* Render markdown content as pre-formatted text for MVP */}
                <div className="whitespace-pre-wrap">{selectedBrief.content}</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <FileText className="size-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">브리프를 생성하거나 선택해주세요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
