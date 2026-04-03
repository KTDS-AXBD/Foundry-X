"use client";

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  fetchGtmOutreachList,
  fetchOutreachStats,
  createGtmOutreach,
  fetchGtmCustomers,
  type GtmOutreach,
  type OutreachStats,
  type GtmCustomer,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, Send, Eye, MessageSquare, CalendarCheck, CheckCircle, XCircle, Archive } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "초안", color: "bg-gray-100 text-gray-700" },
  proposal_ready: { label: "제안서 준비", color: "bg-blue-100 text-blue-700" },
  sent: { label: "발송", color: "bg-indigo-100 text-indigo-700" },
  opened: { label: "열람", color: "bg-purple-100 text-purple-700" },
  responded: { label: "회신", color: "bg-amber-100 text-amber-700" },
  meeting_set: { label: "미팅 확정", color: "bg-emerald-100 text-emerald-700" },
  converted: { label: "전환 성공", color: "bg-green-100 text-green-800" },
  declined: { label: "거절", color: "bg-red-100 text-red-700" },
  archived: { label: "보관", color: "bg-slate-100 text-slate-600" },
};

function StatusBadge({ status }: { status: string }) {
  const info = STATUS_LABELS[status] ?? { label: status, color: "bg-gray-100" };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", info.color)}>
      {info.label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="bg-white dark:bg-zinc-900 border rounded-lg p-4 flex items-center gap-3">
      <Icon className="w-8 h-8 text-muted-foreground" />
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function Component() {
  const [items, setItems] = useState<GtmOutreach[]>([]);
  const [stats, setStats] = useState<OutreachStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      const [listRes, statsRes] = await Promise.all([
        fetchGtmOutreachList(params),
        fetchOutreachStats(),
      ]);
      setItems(listRes.items);
      setStats(statsRes);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">선제안 아웃리치</h1>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> 새 선제안
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="전체" value={stats.total} icon={Send} />
          <StatCard label="발송" value={stats.byStatus.sent ?? 0} icon={Eye} />
          <StatCard label="회신" value={stats.byStatus.responded ?? 0} icon={MessageSquare} />
          <StatCard label="전환" value={stats.byStatus.converted ?? 0} icon={CheckCircle} />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {["", "draft", "proposal_ready", "sent", "responded", "meeting_set", "converted", "declined"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "px-3 py-1 rounded-full text-sm border transition",
              statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80",
            )}
          >
            {s ? (STATUS_LABELS[s]?.label ?? s) : "전체"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">로딩 중...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">아웃리치가 없어요. 새 선제안을 만들어 보세요!</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">제목</th>
                <th className="text-left p-3">고객사</th>
                <th className="text-left p-3">상태</th>
                <th className="text-left p-3">생성일</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t hover:bg-muted/30">
                  <td className="p-3">
                    <Link to={`/gtm/outreach/${item.id}`} className="text-primary hover:underline font-medium">
                      {item.title}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{item.customerName ?? "-"}</td>
                  <td className="p-3"><StatusBadge status={item.status} /></td>
                  <td className="p-3 text-muted-foreground">{new Date(item.createdAt).toLocaleDateString("ko-KR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateOutreachModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}

function CreateOutreachModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [customers, setCustomers] = useState<GtmCustomer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchGtmCustomers().then((r) => setCustomers(r.items)).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!customerId || !title) return;
    setSubmitting(true);
    try {
      await createGtmOutreach({ customerId, title });
      onCreated();
      onClose();
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">새 선제안</h2>
        <div>
          <label className="text-sm font-medium">고객사</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full mt-1 border rounded-md p-2 bg-background"
          >
            <option value="">선택...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mt-1 border rounded-md p-2 bg-background"
            placeholder="제안 제목"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={handleSubmit} disabled={submitting || !customerId || !title}>
            {submitting ? "생성 중..." : "생성"}
          </Button>
        </div>
      </div>
    </div>
  );
}
