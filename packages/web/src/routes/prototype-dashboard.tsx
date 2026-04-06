// F356: Prototype Dashboard 메인 페이지 (Sprint 160)
"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPrototypeJobs, type PrototypeJobItem } from "@/lib/api-client";
import PrototypeCard from "@/components/feature/PrototypeCard";
import PrototypeCostSummary from "@/components/feature/PrototypeCostSummary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_FILTERS = [
  { value: "", label: "전체" },
  { value: "queued", label: "대기" },
  { value: "building", label: "빌드중" },
  { value: "live", label: "라이브" },
  { value: "failed", label: "실패" },
  { value: "feedback_pending", label: "피드백 대기" },
  { value: "dead_letter", label: "폐기" },
];

export function Component() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<PrototypeJobItem[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    fetchPrototypeJobs({
      status: statusFilter || undefined,
      limit,
      offset: page * limit,
    })
      .then((data) => {
        setJobs(data.items);
        setTotal(data.total);
      })
      .catch(() => {
        setJobs([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [statusFilter, page]);

  const liveCount = jobs.filter((j) => j.status === "live").length;
  const failedCount = jobs.filter(
    (j) => j.status === "failed" || j.status === "deploy_failed" || j.status === "dead_letter",
  ).length;
  const totalCost = jobs.reduce((sum, j) => sum + j.costUsd, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">Prototype Dashboard</h1>
        <Badge variant="outline">{total} jobs</Badge>
      </div>

      <PrototypeCostSummary
        totalJobs={total}
        totalCost={totalCost}
        liveCount={liveCount}
        failedCount={failedCount}
      />

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            className={`px-3 py-1 rounded-full text-xs border transition-colors ${
              statusFilter === f.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted"
            }`}
            onClick={() => {
              setStatusFilter(f.value);
              setPage(0);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Job List */}
      {loading ? (
        <div className="text-sm text-muted-foreground">로딩 중...</div>
      ) : jobs.length === 0 ? (
        <div className="text-sm text-muted-foreground">프로토타입 Job이 없어요.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <PrototypeCard
              key={job.id}
              job={job}
              onClick={() => navigate(`/prototype-dashboard/${job.id}`)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > limit && (
        <div className="flex justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            이전
          </Button>
          <span className="text-sm self-center text-muted-foreground">
            {page + 1} / {Math.ceil(total / limit)}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * limit >= total}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
