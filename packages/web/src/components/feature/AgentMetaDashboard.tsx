"use client";

// ─── F530: AgentMetaDashboard — Meta Layer Human Approval UI (Sprint 283) ───

import { useState, useCallback } from "react";
import type { DiagnosticReport, ImprovementProposal } from "@foundry-x/shared";
import { BASE_URL } from "@/lib/api-client";

type DiagnoseResult = { report: DiagnosticReport; proposals: ImprovementProposal[] };

const AXIS_LABELS: Record<string, string> = {
  ToolEffectiveness: "도구 효율",
  Memory: "메모리 활용",
  Planning: "계획 효율",
  Verification: "자기검증",
  Cost: "비용 효율",
  Convergence: "수렴도",
};

const TYPE_COLORS: Record<string, string> = {
  prompt: "#7c3aed",
  tool: "#0284c7",
  model: "#d97706",
  graph: "#16a34a",
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "#fef9c3", text: "#854d0e", label: "대기중" },
  approved: { bg: "#dcfce7", text: "#166534", label: "승인됨" },
  rejected: { bg: "#fee2e2", text: "#991b1b", label: "거부됨" },
};

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color }}>{score}/100</span>
      </div>
      <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

function ProposalCard({
  proposal,
  onApprove,
  onReject,
}: {
  proposal: ImprovementProposal;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const statusStyle = STATUS_STYLES[proposal.status] ?? STATUS_STYLES["pending"];

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ background: TYPE_COLORS[proposal.type] ?? "#6b7280", color: "#fff", fontSize: 11, padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>
          {proposal.type}
        </span>
        <span style={{ background: statusStyle.bg, color: statusStyle.text, fontSize: 11, padding: "2px 8px", borderRadius: 12 }}>
          {statusStyle.label}
        </span>
        <span style={{ fontWeight: 600, flex: 1 }}>{proposal.title}</span>
      </div>

      <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 8px" }}>{proposal.reasoning}</p>

      <details style={{ marginBottom: 8 }}>
        <summary style={{ cursor: "pointer", fontSize: 12, color: "#7c3aed", fontWeight: 500 }}>YAML Diff 보기</summary>
        <pre style={{ background: "#1e1e2e", color: "#cdd6f4", padding: 12, borderRadius: 4, fontSize: 11, overflow: "auto", marginTop: 4 }}>
          {proposal.yamlDiff}
        </pre>
      </details>

      {proposal.status === "pending" && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <button
            onClick={() => onApprove(proposal.id)}
            style={{ background: "#16a34a", color: "#fff", border: "none", padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
          >
            ✓ 승인
          </button>
          {!showRejectForm ? (
            <button
              onClick={() => setShowRejectForm(true)}
              style={{ background: "#dc2626", color: "#fff", border: "none", padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
            >
              ✕ 거부
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8, flex: 1 }}>
              <input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="거부 사유 입력..."
                style={{ flex: 1, padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: 4, fontSize: 13 }}
              />
              <button
                onClick={() => { if (rejectReason.trim()) { onReject(proposal.id, rejectReason); } }}
                disabled={!rejectReason.trim()}
                style={{ background: "#dc2626", color: "#fff", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
              >
                확인
              </button>
              <button
                onClick={() => setShowRejectForm(false)}
                style={{ background: "#e5e7eb", color: "#374151", border: "none", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
              >
                취소
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AgentMetaDashboard() {
  const [sessionId, setSessionId] = useState("");
  const [agentId, setAgentId] = useState("planner");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnoseResult | null>(null);
  const [proposals, setProposals] = useState<ImprovementProposal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const loadProposals = useCallback(async () => {
    const qs = filter !== "all" ? `?status=${filter}` : "";
    const res = await fetch(`${BASE_URL}/meta/proposals${qs}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
    });
    if (res.ok) {
      const data = await res.json() as { proposals: ImprovementProposal[] };
      setProposals(data.proposals);
    }
  }, [filter]);

  const handleDiagnose = useCallback(async () => {
    if (!sessionId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/meta/diagnose`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
        },
        body: JSON.stringify({ sessionId, agentId }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json() as DiagnoseResult;
      setResult(data);
      setProposals(data.proposals);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [sessionId, agentId]);

  const handleApprove = useCallback(async (id: string) => {
    const res = await fetch(`${BASE_URL}/meta/proposals/${id}/approve`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
    });
    if (res.ok) {
      const data = await res.json() as { proposal: ImprovementProposal };
      setProposals((prev) => prev.map((p) => p.id === id ? data.proposal : p));
    }
  }, []);

  const handleReject = useCallback(async (id: string, reason: string) => {
    const res = await fetch(`${BASE_URL}/meta/proposals/${id}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
      },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      const data = await res.json() as { proposal: ImprovementProposal };
      setProposals((prev) => prev.map((p) => p.id === id ? data.proposal : p));
    }
  }, []);

  const filteredProposals = filter === "all" ? proposals : proposals.filter((p) => p.status === filter);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Agent Meta Layer</h1>
      <p style={{ color: "#6b7280", marginBottom: 24, fontSize: 14 }}>
        에이전트 6축 진단 + 개선 제안 Human Approval
      </p>

      {/* 진단 폼 */}
      <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>진단 실행</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="Session ID"
            style={{ flex: "1 1 200px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
          />
          <input
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            placeholder="Agent ID"
            style={{ flex: "1 1 150px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
          />
          <button
            onClick={handleDiagnose}
            disabled={loading || !sessionId.trim()}
            style={{ background: "#7c3aed", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            {loading ? "분석 중..." : "진단 실행"}
          </button>
          <button
            onClick={loadProposals}
            style={{ background: "#e5e7eb", color: "#374151", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
          >
            제안 목록 새로고침
          </button>
        </div>
        {error && <p style={{ color: "#dc2626", marginTop: 8, fontSize: 12 }}>{error}</p>}
      </div>

      {/* 진단 결과 */}
      {result && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600 }}>6축 진단 결과</h2>
            <span style={{ fontSize: 20, fontWeight: 700, color: result.report.overallScore >= 80 ? "#22c55e" : result.report.overallScore >= 60 ? "#f59e0b" : "#ef4444" }}>
              {result.report.overallScore}/100
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
            {result.report.scores.map((s) => (
              <ScoreBar key={s.axis} score={s.score} label={AXIS_LABELS[s.axis] ?? s.axis} />
            ))}
          </div>
        </div>
      )}

      {/* 제안 목록 */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>개선 제안 ({proposals.length}건)</h2>
          <div style={{ display: "flex", gap: 4 }}>
            {(["all", "pending", "approved", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "4px 12px", borderRadius: 12, fontSize: 12, cursor: "pointer",
                  border: "1px solid #d1d5db",
                  background: filter === f ? "#7c3aed" : "#fff",
                  color: filter === f ? "#fff" : "#374151",
                }}
              >
                {f === "all" ? "전체" : f === "pending" ? "대기중" : f === "approved" ? "승인" : "거부"}
              </button>
            ))}
          </div>
        </div>

        {filteredProposals.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 13 }}>
            {proposals.length === 0 ? "진단을 실행하면 개선 제안이 생성돼요." : "해당 상태의 제안이 없어요."}
          </div>
        ) : (
          filteredProposals.map((p) => (
            <ProposalCard key={p.id} proposal={p} onApprove={handleApprove} onReject={handleReject} />
          ))
        )}
      </div>
    </div>
  );
}
