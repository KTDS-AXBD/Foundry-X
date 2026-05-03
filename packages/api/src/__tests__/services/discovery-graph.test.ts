// F528 Graph Orchestration (L3) — DiscoveryGraph TDD Red Phase
import { describe, it, expect, vi } from "vitest";
import { createDiscoveryGraph } from "../../core/agent/services/graphs/discovery-graph.js";
import { GraphEngine } from "../../core/agent/services/graph-engine.js";

describe("F528 DiscoveryGraph", () => {
  it("9개 이상의 노드가 정의되어 있다", () => {
    const def = createDiscoveryGraph();

    // coordinator + 2-0 ~ 2-8 = 최소 10개
    expect(def.nodes.length).toBeGreaterThanOrEqual(9);
  });

  it("coordinator가 진입점(entryPoint)이다", () => {
    const def = createDiscoveryGraph();

    expect(def.entryPoint).toBe("coordinator");
  });

  it("coordinator → stage-2-0 엣지가 존재한다", () => {
    const def = createDiscoveryGraph();

    const edge = def.edges.find((e) => e.from === "coordinator" && e.to === "stage-2-0");
    expect(edge).toBeDefined();
  });

  it("stage-2-1, stage-2-2 노드가 모두 정의되어 있다 (병렬 실행 대상)", () => {
    const def = createDiscoveryGraph();

    const nodeIds = def.nodes.map((n) => n.id);
    expect(nodeIds).toContain("stage-2-1");
    expect(nodeIds).toContain("stage-2-2");
  });

  it("gate 조건 true (itemCount >= 3): stage-2-4 → stage-2-5로 진행한다", () => {
    const def = createDiscoveryGraph();

    const forwardEdge = def.edges.find((e) => e.from === "stage-2-4" && e.to === "stage-2-5");
    expect(forwardEdge).toBeDefined();
    expect(forwardEdge?.condition).toBeDefined();

    // condition이 itemCount >= 3일 때 true
    const out = { nodeId: "stage-2-4", data: { itemCount: 3 } };
    const ctx = {} as never;
    expect(forwardEdge!.condition!(out, ctx)).toBe(true);
  });

  it("gate 조건 false (itemCount < 3): stage-2-4 → stage-2-3 보완 루프를 돈다", () => {
    const def = createDiscoveryGraph();

    const loopEdge = def.edges.find((e) => e.from === "stage-2-4" && e.to === "stage-2-3");
    expect(loopEdge).toBeDefined();
    expect(loopEdge?.condition).toBeDefined();

    // condition이 itemCount < 3일 때 true
    const out = { nodeId: "stage-2-4", data: { itemCount: 2 } };
    const ctx = {} as never;
    expect(loopEdge!.condition!(out, ctx)).toBe(true);
  });

  it("최종 노드 stage-2-8이 노드 목록에 포함된다", () => {
    const def = createDiscoveryGraph();

    const nodeIds = def.nodes.map((n) => n.id);
    expect(nodeIds).toContain("stage-2-8");
  });
});
