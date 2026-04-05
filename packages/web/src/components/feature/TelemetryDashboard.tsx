// ─── F337: TelemetryDashboard — 소스별 카운트 + 이벤트 로그 (Sprint 152) ───

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api-client";

interface ExecutionEvent {
  id: string;
  taskId: string;
  source: string;
  severity: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

const SOURCE_COLORS: Record<string, string> = {
  hook: "#3b82f6",
  ci: "#10b981",
  review: "#8b5cf6",
  discriminator: "#f59e0b",
  sync: "#6366f1",
  manual: "#6b7280",
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string }> = {
  info: { bg: "#f3f4f6", text: "#374151" },
  warn: { bg: "#fef3c7", text: "#92400e" },
  error: { bg: "#fee2e2", text: "#991b1b" },
};

const TIME_OPTIONS = [
  { label: "최근 1시간", value: 1 },
  { label: "최근 24시간", value: 24 },
  { label: "최근 7일", value: 168 },
  { label: "전체", value: 0 },
];

export function TelemetryDashboard() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [timeFilter, setTimeFilter] = useState<number>(24);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const since = timeFilter > 0
      ? new Date(Date.now() - timeFilter * 3600_000).toISOString()
      : undefined;
    const countsParam = since ? `?since=${since}` : "";

    Promise.all([
      fetchApi<Record<string, number>>(`/telemetry/counts${countsParam}`),
      fetchApi<{ items: ExecutionEvent[] }>(
        `/telemetry/events?taskId=&limit=30${sourceFilter ? `&source=${sourceFilter}` : ""}`
      ).catch(() => ({ items: [] })),
    ]).then(([c, e]) => {
      setCounts(c);
      setEvents(e.items);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [sourceFilter, timeFilter]);

  const maxCount = Math.max(...Object.values(counts), 1);
  const sources = Object.keys(SOURCE_COLORS);

  if (loading) {
    return <div style={{ padding: 24, color: "#9ca3af" }}>텔레메트리 로딩 중...</div>;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0 && events.length === 0) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
        <p style={{ fontSize: 18, marginBottom: 8 }}>아직 텔레메트리 이벤트가 없어요</p>
        <p style={{ fontSize: 14 }}>오케스트레이션 루프가 실행되면 이벤트가 기록돼요</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(Number(e.target.value))}
          style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}
        >
          {TIME_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}
        >
          <option value="">모든 소스</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Bar chart */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>
          소스별 이벤트 수 (총 {total}건)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sources.map((src) => {
            const count = counts[src] ?? 0;
            const pct = (count / maxCount) * 100;
            return (
              <div key={src} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 90, fontSize: 12, color: "#6b7280", textAlign: "right" }}>{src}</span>
                <div style={{ flex: 1, height: 20, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: SOURCE_COLORS[src],
                    borderRadius: 4,
                    transition: "width 0.3s",
                    minWidth: count > 0 ? 4 : 0,
                  }} />
                </div>
                <span style={{ width: 40, fontSize: 12, color: "#374151", textAlign: "right" }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event log table */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
          최근 이벤트 로그
        </div>
        {events.length === 0 ? (
          <div style={{ fontSize: 13, color: "#9ca3af" }}>필터 조건에 맞는 이벤트가 없어요</div>
        ) : (
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 500 }}>시간</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 500 }}>소스</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 500 }}>심각도</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 500 }}>태스크</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 500 }}>페이로드</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => {
                const sev = SEVERITY_STYLES[ev.severity] ?? SEVERITY_STYLES.info;
                return (
                  <tr key={ev.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "4px 8px", color: "#9ca3af" }}>
                      {new Date(ev.createdAt).toLocaleString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td style={{ padding: "4px 8px" }}>
                      <span style={{ color: SOURCE_COLORS[ev.source] ?? "#374151" }}>{ev.source}</span>
                    </td>
                    <td style={{ padding: "4px 8px" }}>
                      <span style={{ background: sev.bg, color: sev.text, padding: "1px 6px", borderRadius: 4 }}>
                        {ev.severity}
                      </span>
                    </td>
                    <td style={{ padding: "4px 8px", color: "#374151" }}>{ev.taskId}</td>
                    <td style={{ padding: "4px 8px", color: "#6b7280", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.payload ? JSON.stringify(ev.payload).slice(0, 60) : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
