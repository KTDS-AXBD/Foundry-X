// ─── F362: 운영 지표 대시보드 (Sprint 164, Phase 17) ───
"use client";

import { useState, useEffect } from "react";
import { fetchApi, BASE_URL } from "@/lib/api-client";
import { AgentUsageChart } from "@/components/feature/AgentUsageChart";
import { SkillReuseChart } from "@/components/feature/SkillReuseChart";
import { RuleEffectChart } from "@/components/feature/RuleEffectChart";
import { UnusedHighlight } from "@/components/feature/UnusedHighlight";
import type {
  MetricsOverview,
  RuleEffectivenessResponse,
  AgentUsageResponse,
  SkillReuseResponse,
} from "@foundry-x/shared";

export function Component() {
  const [overview, setOverview] = useState<MetricsOverview | null>(null);
  const [effectiveness, setEffectiveness] = useState<RuleEffectivenessResponse | null>(null);
  const [agentUsage, setAgentUsage] = useState<AgentUsageResponse | null>(null);
  const [skillReuse, setSkillReuse] = useState<SkillReuseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [ov, eff, usage, reuse] = await Promise.all([
          fetchApi<MetricsOverview>(`${BASE_URL}/metrics/overview`),
          fetchApi<RuleEffectivenessResponse>(`${BASE_URL}/guard-rail/effectiveness`),
          fetchApi<AgentUsageResponse>(`${BASE_URL}/metrics/agent-usage`),
          fetchApi<SkillReuseResponse>(`${BASE_URL}/metrics/skill-reuse`),
        ]);
        setOverview(ov);
        setEffectiveness(eff);
        setAgentUsage(usage);
        setSkillReuse(reuse);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load metrics");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "24px 32px" }}>
        <p style={{ color: "#6b7280" }}>운영 지표를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px 32px" }}>
        <p style={{ color: "#ef4444" }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 32px", maxWidth: 960 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
        운영 지표 대시보드
      </h1>
      <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>
        하네스 인프라 활용률, Skill 재사용률, Guard Rail 효과를 한눈에 확인해요
      </p>

      {/* Summary Cards */}
      {overview && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
          <SummaryCard
            title="Rule 효과"
            value={`${overview.ruleEffectiveness.averageScore}%`}
            sub={`${overview.ruleEffectiveness.measuredRules}/${overview.ruleEffectiveness.totalRules} 측정`}
            color="#6366f1"
          />
          <SummaryCard
            title="Skill 재사용률"
            value={`${overview.skillReuse.overallReuseRate}%`}
            sub={`Derived ${overview.skillReuse.derivedCount} / Captured ${overview.skillReuse.capturedCount}`}
            color="#f59e0b"
          />
          <SummaryCard
            title="활용률"
            value={`${overview.agentUsage.activeSources}/${overview.agentUsage.totalSources}`}
            sub={overview.agentUsage.unusedCount > 0
              ? `미사용 ${overview.agentUsage.unusedCount}건`
              : "전체 활용 중"}
            color={overview.agentUsage.unusedCount > 0 ? "#ef4444" : "#10b981"}
          />
        </div>
      )}

      {/* Section: Rule Effectiveness */}
      <Section title="Guard Rail 효과 점수">
        {effectiveness && <RuleEffectChart items={effectiveness.items} />}
      </Section>

      {/* Section: Agent Usage */}
      <Section title="에이전트/스킬 활용률">
        {agentUsage && <AgentUsageChart items={agentUsage.items} />}
      </Section>

      {/* Section: Skill Reuse */}
      <Section title="Skill 재사용률">
        {skillReuse && (
          <SkillReuseChart items={skillReuse.items} overallRate={skillReuse.overallReuseRate} />
        )}
      </Section>

      {/* Section: Unused Highlight */}
      {agentUsage && <UnusedHighlight unusedSources={agentUsage.unusedSources} />}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  sub,
  color,
}: {
  title: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div
      style={{
        padding: 16,
        background: "#fff",
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
      }}
    >
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>{title}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color, marginBottom: 2 }}>{value}</p>
      <p style={{ fontSize: 12, color: "#9ca3af" }}>{sub}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: "#374151", marginBottom: 12 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
