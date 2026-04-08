/**
 * Sprint 223: F460 — 포트폴리오 문서 연결 그래프 (Mermaid flowchart)
 * Sprint 224: 편집 링크 추가 — 각 노드에 편집 URL data-* 속성 포함
 */
import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { PortfolioTree } from "@/lib/api-client";

interface PortfolioGraphProps {
  portfolio: PortfolioTree;
}

/** 노드 ID → 편집 URL 맵을 빌드 */
function buildEditUrlMap(portfolio: PortfolioTree): Map<string, string> {
  const map = new Map<string, string>();
  const bizItemId = portfolio.item.id;

  if (portfolio.businessPlans.length > 0) {
    const latest = portfolio.businessPlans[0]!;
    map.set(`bp_${latest.id.slice(0, 8)}`, `/ax-bd/discovery/${bizItemId}/business-plan`);
  }

  for (const offering of portfolio.offerings) {
    const offId = `off_${offering.id.slice(0, 8)}`;
    map.set(offId, `/ax-bd/offering-editor/${offering.id}`);
  }

  for (const proto of portfolio.prototypes) {
    const pId = `proto_${proto.id.slice(0, 8)}`;
    map.set(pId, `/ax-bd/discovery/${bizItemId}/prototype/${proto.id}`);
  }

  // 루트 노드 → 아이템 상세
  map.set("root", `/ax-bd/discovery/${bizItemId}`);

  return map;
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
    const bpId = `bp_${latest.id.slice(0, 8)}`;
    lines.push(`  ${bpId}["📄 기획서 v${latest.version}"]`);
    lines.push(`  root --> ${bpId}`);
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
  const navigate = useNavigate();
  const editUrlMap = buildEditUrlMap(portfolio);

  // SVG 렌더링 후 노드에 클릭 핸들러 부착
  const attachClickHandlers = useCallback(
    (container: HTMLDivElement) => {
      for (const [nodeId, url] of editUrlMap.entries()) {
        const el = container.querySelector(`[id*="${nodeId}"], [class*="${nodeId}"]`) as HTMLElement | null;
        if (el) {
          el.style.cursor = "pointer";
          el.title = `편집: ${url}`;
          el.dataset.editUrl = url;
          el.addEventListener("click", () => { navigate(url); });
        }
      }
    },
    [editUrlMap, navigate],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = buildMermaidGraph(portfolio);

    const render = async () => {
      try {
        // @ts-expect-error mermaid는 CDN 기반 전역 로드
        const mermaid = (window as Record<string, unknown>).mermaid as { initialize: (c: unknown) => void; render: (id: string, graph: string) => Promise<{ svg: string }> } | undefined;
        if (!mermaid) {
          if (containerRef.current) {
            containerRef.current.innerHTML = `<pre class="text-xs text-muted-foreground whitespace-pre-wrap">${graph}</pre>`;
          }
          return;
        }
        mermaid.initialize({ startOnLoad: false, theme: "neutral" });
        const { svg } = await mermaid.render(`portfolio-graph-${portfolio.item.id}`, graph);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          attachClickHandlers(containerRef.current);
        }
      } catch {
        if (containerRef.current) {
          containerRef.current.innerHTML = `<pre class="text-xs text-muted-foreground whitespace-pre-wrap">${graph}</pre>`;
        }
      }
    };

    void render();
  }, [portfolio, attachClickHandlers]);

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
        연결 구조{" "}
        <span className="font-normal text-xs">(노드 클릭 → 편집)</span>
      </h3>
      <div ref={containerRef} data-portfolio-graph className="min-h-24 overflow-auto" />
    </div>
  );
}
