"use client";

import { useEffect, useState } from "react";
import {
  getKpiSummary,
  getKpiTrends,
  getKpiEvents,
  fetchPhase4Kpi,
  type KpiSummary,
  type KpiTrendPoint,
  type KpiEventItem,
  type Phase4Kpi,
} from "@/lib/api-client";
import { NpsSummaryWidget } from "@/components/feature/NpsSummaryWidget";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useAsync<T>(fetcher: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ data: null, loading: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function Card({
  title,
  loading,
  error,
  children,
}: {
  title: string;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h3>
      {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
      {error && <div className="text-sm text-destructive">{error}</div>}
      {!loading && !error && children}
    </div>
  );
}

function KpiTargetCard({
  title,
  value,
  target,
  met,
}: {
  title: string;
  value: string;
  target: string;
  met: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{title}</div>
      <div className={`text-2xl font-bold ${met ? "text-green-500" : "text-yellow-500"}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        목표: {target} {met ? "✓" : "—"}
      </div>
    </div>
  );
}

function Phase4KpiSection() {
  const kpi = useAsync<Phase4Kpi>(() => fetchPhase4Kpi(28));
  const latestWau = kpi.data?.wauTrend.length ? kpi.data.wauTrend[kpi.data.wauTrend.length - 1].wau : 0;
  const maxWau = kpi.data?.wauTrend.length ? Math.max(...kpi.data.wauTrend.map((w) => w.wau), 1) : 1;

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-lg font-semibold">Phase 4 Go 판정 KPI</h2>
      {kpi.loading && <div className="text-sm text-muted-foreground">Loading...</div>}
      {kpi.error && <div className="text-sm text-destructive">{kpi.error}</div>}
      {kpi.data && (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <KpiTargetCard
              title="K7 Weekly Active Users"
              value={`${latestWau}명`}
              target="5명+"
              met={latestWau >= 5}
            />
            <KpiTargetCard
              title="K8 에이전트 완료율"
              value={`${kpi.data.agentCompletionRate}%`}
              target=">70%"
              met={kpi.data.agentCompletionRate > 70}
            />
            <KpiTargetCard
              title="K9 통합 워크플로우"
              value={`${kpi.data.serviceIntegrationRate}%`}
              target=">80%"
              met={kpi.data.serviceIntegrationRate > 80}
            />
          </div>
          {/* WAU 주간 트렌드 */}
          {kpi.data.wauTrend.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">주간 WAU 트렌드</h3>
              <div className="flex items-end gap-2" style={{ height: 120 }}>
                {kpi.data.wauTrend.map((w) => {
                  const heightPct = (w.wau / maxWau) * 100;
                  return (
                    <div
                      key={w.week}
                      className="flex flex-1 flex-col items-center gap-1"
                      style={{ height: "100%" }}
                    >
                      <div className="flex flex-1 flex-col justify-end w-full">
                        <div
                          className="w-full rounded-t bg-blue-500"
                          style={{ height: `${heightPct}%`, minHeight: w.wau > 0 ? 4 : 0 }}
                          title={`${w.week}: ${w.wau}명`}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{w.week.slice(-3)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

const EVENT_LABELS: Record<string, string> = {
  page_view: "Page Views",
  api_call: "API Calls",
  agent_task: "Agent Tasks",
  cli_invoke: "CLI Invokes",
  sdd_check: "SDD Checks",
};

export default function AnalyticsPage() {
  const summary = useAsync<KpiSummary>(() => getKpiSummary(7));
  const trends = useAsync<KpiTrendPoint[]>(() => getKpiTrends(30, "day").then((r) => r.trends));
  const events = useAsync<{ events: KpiEventItem[]; total: number }>(() => getKpiEvents());

  const maxTrendValue =
    trends.data && trends.data.length > 0
      ? Math.max(...trends.data.map((t) => t.pageViews + t.apiCalls + t.agentTasks), 1)
      : 1;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Analytics</h1>

      {/* KPI Summary Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card title="Weekly Active Users" loading={summary.loading} error={summary.error}>
          {summary.data && (
            <div className="text-4xl font-bold text-blue-500">{summary.data.wau}</div>
          )}
        </Card>

        <Card title="Agent Completion Rate" loading={summary.loading} error={summary.error}>
          {summary.data && (
            <div className="text-4xl font-bold text-green-500">
              {summary.data.agentCompletionRate}%
            </div>
          )}
        </Card>

        <Card title="SDD Integrity Rate" loading={summary.loading} error={summary.error}>
          {summary.data && (
            <div className="text-4xl font-bold text-yellow-500">
              {summary.data.sddIntegrityRate}%
            </div>
          )}
        </Card>

        <Card title="Total Events (7d)" loading={summary.loading} error={summary.error}>
          {summary.data && (
            <div className="text-4xl font-bold text-foreground">
              {summary.data.totalEvents.toLocaleString()}
            </div>
          )}
        </Card>
      </div>

      {/* Trends Bar Chart */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Daily Trends (30d)</h2>
        {trends.loading && <div className="text-sm text-muted-foreground">Loading...</div>}
        {trends.error && <div className="text-sm text-destructive">{trends.error}</div>}
        {trends.data && trends.data.length === 0 && (
          <div className="text-sm text-muted-foreground">No trend data available</div>
        )}
        {trends.data && trends.data.length > 0 && (
          <>
            <div className="flex items-end gap-1" style={{ height: 200 }}>
              {trends.data.map((t) => {
                const total = t.pageViews + t.apiCalls + t.agentTasks;
                const heightPct = (total / maxTrendValue) * 100;
                const pvPct = total > 0 ? (t.pageViews / total) * 100 : 0;
                const acPct = total > 0 ? (t.apiCalls / total) * 100 : 0;
                return (
                  <div
                    key={t.date}
                    className="group relative flex flex-1 flex-col justify-end"
                    style={{ height: "100%" }}
                    title={`${t.date}: PV=${t.pageViews}, API=${t.apiCalls}, Agent=${t.agentTasks}`}
                  >
                    <div
                      className="flex flex-col overflow-hidden rounded-t"
                      style={{ height: `${heightPct}%`, minHeight: total > 0 ? 2 : 0 }}
                    >
                      <div className="bg-blue-500" style={{ height: `${pvPct}%` }} />
                      <div className="bg-green-500" style={{ height: `${acPct}%` }} />
                      <div className="flex-1 bg-yellow-500" />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                Page Views
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                API Calls
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-yellow-500" />
                Agent Tasks
              </span>
            </div>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Breakdown Table */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Event Breakdown</h2>
          {summary.loading && <div className="text-sm text-muted-foreground">Loading...</div>}
          {summary.error && <div className="text-sm text-destructive">{summary.error}</div>}
          {summary.data && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2">Event Type</th>
                  <th className="pb-2 text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.data.breakdown).map(([type, count]) => (
                  <tr key={type} className="border-b border-border">
                    <td className="py-2">{EVENT_LABELS[type] ?? type}</td>
                    <td className="py-2 text-right font-mono">{count}</td>
                  </tr>
                ))}
                {Object.keys(summary.data.breakdown).length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-2 text-muted-foreground">
                      No events recorded
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Events Table */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Recent Events</h2>
          {events.loading && <div className="text-sm text-muted-foreground">Loading...</div>}
          {events.error && <div className="text-sm text-destructive">{events.error}</div>}
          {events.data && (
            <>
              <div className="mb-2 text-xs text-muted-foreground">
                Total: {events.data.total}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2">Type</th>
                    <th className="pb-2">User</th>
                    <th className="pb-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {events.data.events.map((ev) => (
                    <tr key={ev.id} className="border-b border-border">
                      <td className="py-2">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {ev.eventType}
                        </span>
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {ev.userId ? ev.userId.slice(0, 8) : "—"}
                      </td>
                      <td className="py-2 text-right text-xs text-muted-foreground">
                        {new Date(ev.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {events.data.events.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-2 text-muted-foreground">
                        No events yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {/* Phase 4 KPI */}
      <div className="mt-8">
        <Phase4KpiSection />
      </div>

      {/* NPS Feedback Summary */}
      <div className="mt-8">
        <NpsSummaryWidget />
      </div>
    </div>
  );
}
