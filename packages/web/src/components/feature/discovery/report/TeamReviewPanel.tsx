/**
 * Sprint 157: F349 — 팀 검토 & Handoff 패널
 * Go/Hold/Drop 투표 + Executive Summary + Decision Record + Handoff Checklist
 */
import { useEffect, useState, useCallback } from "react";
import { fetchApi, postApi } from "@/lib/api-client";
import type { TeamReviewVote, ExecutiveSummaryData, HandoffCheckItem } from "@foundry-x/shared";

interface Props {
  itemId: string;
}

const DECISION_OPTIONS = [
  { value: "Go" as const, label: "Go", color: "bg-green-100 border-green-400 text-green-800" },
  { value: "Hold" as const, label: "Hold", color: "bg-amber-100 border-amber-400 text-amber-800" },
  { value: "Drop" as const, label: "Drop", color: "bg-red-100 border-red-400 text-red-800" },
];

const DEFAULT_CHECKLIST: HandoffCheckItem[] = [
  { id: "prd", label: "PRD 초안 작성 완료", checked: false, requiredForGo: true },
  { id: "team-approved", label: "팀 Go 판정 (과반수)", checked: false, requiredForGo: true },
  { id: "sponsor", label: "스폰서/PO 확보", checked: false, requiredForGo: true },
  { id: "resource", label: "리소스 배정 확인", checked: false, requiredForGo: false },
  { id: "timeline", label: "형상화 일정 합의", checked: false, requiredForGo: false },
  { id: "risk", label: "핵심 리스크 식별 완료", checked: false, requiredForGo: false },
];

function VoteForm({ itemId, onSubmitted }: { itemId: string; onSubmitted: () => void }) {
  const [decision, setDecision] = useState<"Go" | "Hold" | "Drop" | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!decision) return;
    setSubmitting(true);
    try {
      await postApi(`/ax-bd/team-reviews/${itemId}`, { decision, comment });
      setComment("");
      setDecision(null);
      onSubmitted();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h4 className="text-sm font-semibold">내 투표</h4>
      <div className="flex gap-2">
        {DECISION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setDecision(opt.value)}
            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
              decision === opt.value ? opt.color : "bg-card border-muted text-muted-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="의견을 남겨주세요 (선택)"
        className="w-full rounded-lg border p-2 text-sm min-h-[60px] resize-none"
      />
      <button
        onClick={handleSubmit}
        disabled={!decision || submitting}
        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50"
      >
        {submitting ? "제출 중..." : "투표 제출"}
      </button>
    </div>
  );
}

function VoteList({ votes }: { votes: TeamReviewVote[] }) {
  if (votes.length === 0) return <p className="text-sm text-muted-foreground">아직 투표가 없어요</p>;

  const counts = { Go: 0, Hold: 0, Drop: 0 };
  for (const v of votes) {
    if (v.decision in counts) counts[v.decision as keyof typeof counts]++;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-sm">
        <span className="text-green-700 font-medium">Go: {counts.Go}</span>
        <span className="text-amber-700 font-medium">Hold: {counts.Hold}</span>
        <span className="text-red-700 font-medium">Drop: {counts.Drop}</span>
      </div>
      <div className="space-y-2">
        {votes.map((v) => {
          const style = DECISION_OPTIONS.find((o) => o.value === v.decision);
          return (
            <div key={v.id} className="flex items-start gap-2 text-sm border rounded-lg p-2">
              <span className={`text-xs px-2 py-0.5 rounded ${style?.color ?? ""}`}>{v.decision}</span>
              <div className="flex-1">
                <span className="font-medium">{v.reviewerName}</span>
                {v.comment && <p className="text-muted-foreground mt-0.5">{v.comment}</p>}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(v.createdAt).toLocaleDateString("ko-KR")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExecutiveSummarySection({ summary }: { summary: ExecutiveSummaryData | null }) {
  if (!summary) return null;

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <h4 className="text-sm font-semibold">Executive Summary</h4>
      <p className="text-sm font-medium">{summary.oneLiner}</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-muted-foreground">문제:</span> {summary.problem}</div>
        <div><span className="text-muted-foreground">솔루션:</span> {summary.solution}</div>
        <div><span className="text-muted-foreground">시장:</span> {summary.market}</div>
        <div><span className="text-muted-foreground">경쟁:</span> {summary.competition}</div>
        <div><span className="text-muted-foreground">비즈니스 모델:</span> {summary.businessModel}</div>
        <div><span className="text-muted-foreground">추천:</span> {summary.recommendation}</div>
      </div>
      {summary.openQuestions.length > 0 && (
        <div>
          <div className="text-xs font-medium text-amber-700">Open Questions</div>
          <ul className="text-xs space-y-0.5">
            {summary.openQuestions.map((q, i) => <li key={i}>• {q}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function HandoffChecklistSection({ checklist, onChange }: {
  checklist: HandoffCheckItem[];
  onChange: (id: string, checked: boolean) => void;
}) {
  const requiredPassed = checklist.filter((c) => c.requiredForGo).every((c) => c.checked);

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <h4 className="text-sm font-semibold">
        형상화 Handoff 체크리스트
        {requiredPassed && <span className="ml-2 text-xs text-green-600">준비 완료</span>}
      </h4>
      <div className="space-y-1">
        {checklist.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(e) => onChange(item.id, e.target.checked)}
              className="rounded"
            />
            <span className={item.checked ? "line-through text-muted-foreground" : ""}>
              {item.label}
            </span>
            {item.requiredForGo && (
              <span className="text-xs text-red-500">필수</span>
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function TeamReviewPanel({ itemId }: Props) {
  const [votes, setVotes] = useState<TeamReviewVote[]>([]);
  const [summary, setSummary] = useState<ExecutiveSummaryData | null>(null);
  const [checklist, setChecklist] = useState(DEFAULT_CHECKLIST);

  const loadVotes = useCallback(async () => {
    try {
      const res = await fetchApi<{ data: TeamReviewVote[] }>(`/ax-bd/team-reviews/${itemId}`);
      setVotes(res.data ?? []);
    } catch { /* ignore */ }
  }, [itemId]);

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetchApi<ExecutiveSummaryData>(`/ax-bd/discovery-report/${itemId}/summary`);
      setSummary(res);
    } catch { /* ignore - summary might not exist yet */ }
  }, [itemId]);

  useEffect(() => {
    loadVotes();
    loadSummary();
  }, [loadVotes, loadSummary]);

  const handleChecklistChange = (id: string, checked: boolean) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked } : item))
    );
  };

  return (
    <div className="space-y-4 pt-6 border-t">
      <h3 className="text-lg font-bold">팀 검토 & Handoff</h3>
      <ExecutiveSummarySection summary={summary} />
      <VoteForm itemId={itemId} onSubmitted={loadVotes} />
      <VoteList votes={votes} />
      <HandoffChecklistSection checklist={checklist} onChange={handleChecklistChange} />
    </div>
  );
}
