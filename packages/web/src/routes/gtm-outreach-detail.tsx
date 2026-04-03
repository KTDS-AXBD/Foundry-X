"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchGtmOutreach,
  fetchGtmCustomer,
  updateGtmOutreachStatus,
  generateOutreachProposal,
  deleteGtmOutreach,
  type GtmOutreach,
  type GtmCustomer,
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Sparkles, Trash2 } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  proposal_ready: "제안서 준비",
  sent: "발송",
  opened: "열람",
  responded: "회신",
  meeting_set: "미팅 확정",
  converted: "전환 성공",
  declined: "거절",
  archived: "보관",
};

const NEXT_STATUSES: Record<string, string[]> = {
  draft: ["proposal_ready", "declined", "archived"],
  proposal_ready: ["sent", "declined", "archived"],
  sent: ["opened", "responded", "declined", "archived"],
  opened: ["responded", "declined", "archived"],
  responded: ["meeting_set", "declined", "archived"],
  meeting_set: ["converted", "declined", "archived"],
  converted: ["archived"],
  declined: ["archived"],
  archived: [],
};

export function Component() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [outreach, setOutreach] = useState<GtmOutreach | null>(null);
  const [customer, setCustomer] = useState<GtmCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [statusNote, setStatusNote] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const o = await fetchGtmOutreach(id);
      setOutreach(o);
      if (o.customerId) {
        const c = await fetchGtmCustomer(o.customerId);
        setCustomer(c);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      await generateOutreachProposal(id);
      await load();
    } catch {
      /* ignore */
    } finally {
      setGenerating(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await updateGtmOutreachStatus(id, newStatus, statusNote || undefined);
      setStatusNote("");
      await load();
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteGtmOutreach(id);
      navigate("/gtm/outreach");
    } catch {
      /* ignore */
    }
  };

  if (loading) return <p className="p-6 text-muted-foreground">로딩 중...</p>;
  if (!outreach) return <p className="p-6 text-red-500">아웃리치를 찾을 수 없어요.</p>;

  const nextStatuses = NEXT_STATUSES[outreach.status] ?? [];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/gtm/outreach")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 목록
        </Button>
        <h1 className="text-xl font-bold flex-1">{outreach.title}</h1>
        <span className={cn(
          "px-3 py-1 rounded-full text-sm font-medium",
          outreach.status === "converted" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-700",
        )}>
          {STATUS_LABELS[outreach.status] ?? outreach.status}
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* 고객 정보 */}
        <div className="border rounded-lg p-4 space-y-2">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase">고객 정보</h2>
          {customer ? (
            <>
              <p className="font-medium text-lg">{customer.companyName}</p>
              {customer.industry && <p className="text-sm">업종: {customer.industry}</p>}
              {customer.contactName && <p className="text-sm">담당: {customer.contactName}</p>}
              {customer.contactEmail && <p className="text-sm">이메일: {customer.contactEmail}</p>}
              {customer.companySize && <p className="text-sm">규모: {customer.companySize}</p>}
            </>
          ) : (
            <p className="text-muted-foreground">고객 정보 없음</p>
          )}
        </div>

        {/* 제안서 */}
        <div className="md:col-span-2 border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase">제안서</h2>
            {outreach.offeringPackId && (
              <Button size="sm" onClick={handleGenerate} disabled={generating}>
                <Sparkles className="w-4 h-4 mr-1" />
                {generating ? "생성 중..." : outreach.proposalContent ? "재생성" : "제안서 생성"}
              </Button>
            )}
          </div>
          {outreach.proposalContent ? (
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
              {outreach.proposalContent}
            </div>
          ) : (
            <p className="text-muted-foreground">
              {outreach.offeringPackId
                ? "아직 제안서가 생성되지 않았어요. '제안서 생성' 버튼을 클릭하세요."
                : "Offering Pack이 연결되지 않아 자동 생성이 불가해요."}
            </p>
          )}
          {outreach.proposalGeneratedAt && (
            <p className="text-xs text-muted-foreground">
              생성: {new Date(outreach.proposalGeneratedAt).toLocaleString("ko-KR")}
            </p>
          )}
        </div>
      </div>

      {/* 상태 변경 */}
      {nextStatuses.length > 0 && (
        <div className="border rounded-lg p-4 space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase">상태 변경</h2>
          <textarea
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            placeholder="메모 (선택사항)"
            className="w-full border rounded-md p-2 text-sm bg-background"
            rows={2}
          />
          <div className="flex gap-2 flex-wrap">
            {nextStatuses.map((s) => (
              <Button key={s} variant="outline" size="sm" onClick={() => handleStatusChange(s)}>
                {STATUS_LABELS[s] ?? s}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 삭제 */}
      {outreach.status === "draft" && (
        <div className="flex justify-end">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-1" /> 삭제
          </Button>
        </div>
      )}
    </div>
  );
}
