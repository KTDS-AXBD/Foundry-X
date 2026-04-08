/**
 * Sprint 223: F460 — 포트폴리오 문서 연결 그래프 (Mermaid flowchart)
 */
import { useEffect, useRef } from "react";
import type { PortfolioTree } from "@/lib/api-client";

interface PortfolioGraphProps {
  portfolio: PortfolioTree;
}

function buildMermaidGraph(portfolio: PortfolioTree): string {
  const { item, classification, evaluations, startingPoint, criteria, businessPlans, offerings, prototypes } = portfolio;

  const escapeLabel = (s: string) => s.replace(/["\[\]]/g, "").slice(0, 30);
  const lines: string[] = ["graph TD"];

  lines.push(`  root["🏢 ${escapeLabel(item.title)}"]`);

  if (classification) {
    lines.push(`  cls["📂 분류: ${escapeLabel(classification.itemType)}"]`);
    lines.push("  root --> cls");
  }

  if (evaluations.length > 0) {
    const avgScore = (evaluations.reduce((s, e) => s + e.avgScore, 0) / evaluations.length).toFixed(1);
    lines.push(`  eval["⭐ 평가 ${evaluations.length}건 ★${avgScore}"]`);
    lines.push("  root --> eval");
  }

  if (startingPoint) {
    lines.push(`  sp["🚀 시작점: ${escapeLabel(startingPoint.startingPoint)}"]`);
    lines.push("  root --> sp");
  }

  const completedCriteria = criteria.filter((c) => c.status === "completed").length;
  if (criteria.length > 0) {
    lines.push(`  crit["✅ 발굴기준 ${completedCriteria}/${criteria.length}"]`);
    lines.push("  root --> crit");
  }

  if (businessPlans.length > 0) {
    const latest = businessPlans[0]!;
    lines.push(`  bp["📄 기획서 v${latest.version}"]`);
    lines.push("  root --> bp");
  }

  for (const offering of offerings) {
    const offId = `off_${offering.id.slice(0, 8)}`;
    lines.push(`  ${offId}["📑 ${escapeLabel(offering.title)}"]`);
    lines.push(`  root --> ${offId}`);

    for (const protoId of offering.linkedPrototypeIds) {
      const proto = prototypes.find((p) => p.id === protoId);
      if (proto) {
        const pId = `proto_${proto.id.slice(0, 8)}`;
        lines.push(`  ${pId}["🖥️ Prototype v${proto.version}"]`);
        lines.push(`  ${offId} --> ${pId}`);
      }
    }
  }

  // offering과 연결되지 않은 standalone prototypes
  const linkedProtoIds = new Set(offerings.flatMap((o) => o.linkedPrototypeIds));
  for (const proto of prototypes) {
    if (!linkedProtoIds.has(proto.id)) {
      const pId = `proto_${proto.id.slice(0, 8)}`;
      lines.push(`  ${pId}["🖥️ Prototype v${proto.version}"]`);
      lines.push(`  root --> ${pId}`);
    }
  }

  return lines.join("\n");
}

export function PortfolioGraph({ portfolio }: PortfolioGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = buildMermaidGraph(portfolio);

    // Mermaid를 동적으로 로드 (CDN)
    const render = async () => {
      try {
        // @ts-expect-error mermaid는 CDN 기반 전역 로드
        const mermaid = (window as Record<string, unknown>).mermaid as { initialize: (c: unknown) => void; render: (id: string, graph: string) => Promise<{ svg: string }> } | undefined;
        if (!mermaid) {
          // mermaid가 없으면 fallback: 텍스트 표시
          if (containerRef.current) {
            containerRef.current.innerHTML = `<pre class="text-xs text-muted-foreground whitespace-pre-wrap">${graph}</pre>`;
          }
          return;
        }
        mermaid.initialize({ startOnLoad: false, theme: "neutral" });
        const { svg } = await mermaid.render(`portfolio-graph-${portfolio.item.id}`, graph);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch {
        // 렌더링 실패 시 fallback
        if (containerRef.current) {
          containerRef.current.innerHTML = `<pre class="text-xs text-muted-foreground whitespace-pre-wrap">${graph}</pre>`;
        }
      }
    };

    void render();
  }, [portfolio]);

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">연결 구조</h3>
      <div ref={containerRef} data-portfolio-graph className="min-h-24 overflow-auto" />
    </div>
  );
}
