"use client";

import { useEffect, useState } from "react";
import { getOrgSharedBmcs, getOrgActivityFeed } from "@/lib/api-client";
import type { OrgSharedBmcItem, OrgActivityItem } from "@/lib/api-client";
import { useOrgStore } from "@/lib/stores/org-store";

function BmcCard({ bmc }: { bmc: OrgSharedBmcItem }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
      <h3 className="font-semibold text-sm">{bmc.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {bmc.authorName ?? "Unknown"} &middot; {bmc.syncStatus}
      </p>
      <p className="mt-2 text-[10px] text-muted-foreground">
        {new Date(bmc.updatedAt).toLocaleDateString("ko-KR")}
      </p>
    </div>
  );
}

function ActivityItem({ item }: { item: OrgActivityItem }) {
  const typeLabels: Record<string, string> = {
    bmc_created: "BMC 생성",
    feedback_submitted: "피드백 제출",
  };

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium">{item.actorName ?? "Unknown"}</span>
          {" — "}
          <span className="text-muted-foreground">{typeLabels[item.type] ?? item.type}</span>
        </p>
        <p className="truncate text-xs text-muted-foreground">{item.title}</p>
        <p className="text-[10px] text-muted-foreground">
          {new Date(item.timestamp).toLocaleString("ko-KR")}
        </p>
      </div>
    </div>
  );
}

export function Component() {
  const [tab, setTab] = useState<"bmcs" | "activity">("bmcs");
  const [bmcs, setBmcs] = useState<OrgSharedBmcItem[]>([]);
  const [activity, setActivity] = useState<OrgActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { activeOrgId } = useOrgStore();

  useEffect(() => {
    if (!activeOrgId) return;
    setLoading(true);

    if (tab === "bmcs") {
      getOrgSharedBmcs(activeOrgId)
        .then((res) => setBmcs(res.items))
        .catch(() => setBmcs([]))
        .finally(() => setLoading(false));
    } else {
      getOrgActivityFeed(activeOrgId, 20)
        .then((res) => setActivity(res.items))
        .catch(() => setActivity([]))
        .finally(() => setLoading(false));
    }
  }, [activeOrgId, tab]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">팀 공유</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          같은 조직 내 팀원들의 산출물과 활동을 확인하세요
        </p>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("bmcs")}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "bmcs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          BMC
        </button>
        <button
          type="button"
          onClick={() => setTab("activity")}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "activity"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          활동
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">불러오는 중...</div>
      ) : tab === "bmcs" ? (
        bmcs.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            아직 팀 BMC가 없어요
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bmcs.map((bmc) => (
              <BmcCard key={bmc.id} bmc={bmc} />
            ))}
          </div>
        )
      ) : activity.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          아직 팀 활동이 없어요
        </div>
      ) : (
        <div className="divide-y divide-border">
          {activity.map((item) => (
            <ActivityItem key={`${item.type}-${item.resourceId}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
