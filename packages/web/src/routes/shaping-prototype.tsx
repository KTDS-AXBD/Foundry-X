"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchApi } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import HitlSectionReview from "@/components/feature/hitl/HitlSectionReview";
import ReviewStatusBadge from "@/components/feature/hitl/ReviewStatusBadge";
import ReviewSummaryBar from "@/components/feature/hitl/ReviewSummaryBar";
import { VersionBadge } from "@/components/feature/VersionBadge";

interface LinkedOffering {
  offeringId: string;
  offeringTitle: string;
}

interface PrototypeItem {
  id: string;
  bizItemId: string;
  bizItemTitle: string;
  version: number;
  format: string;
  templateUsed: string | null;
  generatedAt: string;
}

interface PrototypeDetail extends PrototypeItem {
  content: string;
  modelUsed: string | null;
  tokensUsed: number;
  linkedOfferings: LinkedOffering[];
}

interface ReviewSummary {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  revisionRequested: number;
}

interface SectionReview {
  id: string;
  sectionId: string;
  status: string;
  framework: string;
  comment: string | null;
  createdAt: string;
}

const FRAMEWORK_OPTIONS = ["react", "vue", "html"] as const;
const PROTOTYPE_SECTIONS = ["UI 레이아웃", "컴포넌트 구조", "네비게이션", "데이터 바인딩", "스타일링"];

export function Component() {
  const [prototypes, setPrototypes] = useState<PrototypeItem[]>([]);
  const [selected, setSelected] = useState<PrototypeItem | null>(null);
  const [detail, setDetail] = useState<PrototypeDetail | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [reviews, setReviews] = useState<SectionReview[]>([]);
  const [framework, setFramework] = useState<string>("react");

  useEffect(() => {
    fetchApi<{ items: PrototypeItem[] }>("/ax-bd/prototypes")
      .then((data) => setPrototypes(data.items))
      .catch(() => {});
  }, []);

  const loadDetail = useCallback(async (p: PrototypeItem) => {
    try {
      const [d, s, r] = await Promise.all([
        fetchApi<PrototypeDetail>(`/ax-bd/prototypes/${p.id}`),
        fetchApi<ReviewSummary>(`/ax-bd/prototypes/${p.id}/review-summary`),
        fetchApi<SectionReview[]>(`/ax-bd/prototypes/${p.id}/reviews`),
      ]);
      setDetail(d);
      setSummary(s);
      setReviews(r);
    } catch { /* ignore */ }
  }, []);

  const loadReviews = useCallback(async () => {
    if (!selected) return;
    try {
      const [s, r] = await Promise.all([
        fetchApi<ReviewSummary>(`/ax-bd/prototypes/${selected.id}/review-summary`),
        fetchApi<SectionReview[]>(`/ax-bd/prototypes/${selected.id}/reviews`),
      ]);
      setSummary(s);
      setReviews(r);
    } catch { /* ignore */ }
  }, [selected]);

  useEffect(() => {
    if (selected) loadDetail(selected);
  }, [selected, loadDetail]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-display">Prototype</h1>
          <VersionBadge artifactType="prototype" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">프레임워크:</span>
          {FRAMEWORK_OPTIONS.map((fw) => (
            <button
              key={fw}
              onClick={() => setFramework(fw)}
              className={`rounded px-3 py-1 text-sm transition-colors ${
                framework === fw ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {fw.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {!selected ? (
        <div className="space-y-3">
          {prototypes.length === 0 && (
            <p className="text-muted-foreground">프로토타입이 없어요. 사업 아이템에서 생성해 주세요.</p>
          )}
          {prototypes.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="w-full rounded-lg border p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{p.bizItemTitle || p.bizItemId}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">v{p.version}</Badge>
                  <Badge variant="secondary">{p.format}</Badge>
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {p.templateUsed ?? "기본 템플릿"} &middot; {new Date(p.generatedAt).toLocaleDateString("ko")}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={() => { setSelected(null); setDetail(null); setSummary(null); setReviews([]); }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; 목록으로
          </button>

          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">{selected.bizItemTitle || selected.bizItemId}</h2>
            <Badge variant="outline">v{selected.version}</Badge>
            <Badge variant="secondary">{selected.format}</Badge>
          </div>

          {detail && detail.linkedOfferings.length > 0 && (
            <div className="rounded-lg border p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">연결된 Offering</p>
              <div className="flex flex-wrap gap-2">
                {detail.linkedOfferings.map((o) => (
                  <a
                    key={o.offeringId}
                    href={`/offering/${o.offeringId}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {o.offeringTitle}
                  </a>
                ))}
              </div>
            </div>
          )}

          {summary && <ReviewSummaryBar summary={summary} />}

          <div className="space-y-4">
            {PROTOTYPE_SECTIONS.map((sec) => {
              const latest = reviews.find((r) => r.sectionId === sec);
              return (
                <div key={sec} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{sec}</h3>
                    {latest && <ReviewStatusBadge status={latest.status} />}
                  </div>
                  <HitlSectionReview
                    entityId={selected.id}
                    entityType="prototype"
                    sectionId={sec}
                    onReview={() => loadReviews()}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
