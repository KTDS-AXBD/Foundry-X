// F528 Graph Orchestration (L3) — TDD Red Phase
// describe: GraphEngine 핵심 실행 엔진 테스트
import { describe, it, expect, vi } from "vitest";
import { GraphEngine } from "../../core/agent/orchestration/graph-engine.js";
import type { GraphNodeInput, GraphNodeOutput, GraphExecutionContext } from "@foundry-x/shared";

function makeHandler(outputData: unknown) {
  return async (input: GraphNodeInput, _ctx: GraphExecutionContext): Promise<GraphNodeOutput> => ({
    nodeId: input.nodeId,
    data: outputData,
  });
}

describe("F528 GraphEngine", () => {
  it("순차 실행: A→B→C 노드가 순서대로 실행된다", async () => {
    const order: string[] = [];

    const engine = new GraphEngine();
    engine.addNode({ id: "A", handler: async (inp) => { order.push("A"); return { nodeId: inp.nodeId, data: "a" }; } });
    engine.addNode({ id: "B", handler: async (inp) => { order.push("B"); return { nodeId: inp.nodeId, data: "b" }; } });
    engine.addNode({ id: "C", handler: async (inp) => { order.push("C"); return { nodeId: inp.nodeId, data: "c" }; } });
    engine.addEdge({ from: "A", to: "B" });
    engine.addEdge({ from: "B", to: "C" });
    engine.setEntryPoint("A");

    const result = await engine.run("start", "sess-1", "key-1");

    expect(order).toEqual(["A", "B", "C"]);
    expect(result.finalOutput.data).toBe("c");
  });

  it("조건부 분기: condition=true 엣지만 실행된다", async () => {
    const executed: string[] = [];

    const engine = new GraphEngine();
    engine.addNode({ id: "start", handler: async (inp) => { return { nodeId: inp.nodeId, data: { score: 5 } }; } });
    engine.addNode({ id: "high", handler: async (inp) => { executed.push("high"); return { nodeId: inp.nodeId, data: "high" }; } });
    engine.addNode({ id: "low", handler: async (inp) => { executed.push("low"); return { nodeId: inp.nodeId, data: "low" }; } });
    engine.addEdge({ from: "start", to: "high", condition: (out) => (out.data as { score: number }).score >= 3 });
    engine.addEdge({ from: "start", to: "low", condition: (out) => (out.data as { score: number }).score < 3 });
    engine.setEntryPoint("start");

    await engine.run("start", "sess-2", "key-2");

    expect(executed).toContain("high");
    expect(executed).not.toContain("low");
  });

  it("조건부 분기: condition=false 엣지는 스킵된다", async () => {
    const executed: string[] = [];

    const engine = new GraphEngine();
    engine.addNode({ id: "start", handler: makeHandler({ score: 1 }) });
    engine.addNode({ id: "never", handler: async (inp) => { executed.push("never"); return { nodeId: inp.nodeId, data: null }; } });
    engine.addEdge({ from: "start", to: "never", condition: (out) => (out.data as { score: number }).score >= 10 });
    engine.setEntryPoint("start");

    await engine.run("start", "sess-3", "key-3");

    expect(executed).toHaveLength(0);
  });

  it("병렬 실행: 독립 노드 A→B, A→C가 동시 실행된다", async () => {
    const startTimes: Record<string, number> = {};
    const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    const engine = new GraphEngine();
    engine.addNode({ id: "A", handler: makeHandler("a") });
    engine.addNode({
      id: "B",
      handler: async (inp) => {
        startTimes["B"] = Date.now();
        await delay(20);
        return { nodeId: inp.nodeId, data: "b" };
      },
    });
    engine.addNode({
      id: "C",
      handler: async (inp) => {
        startTimes["C"] = Date.now();
        await delay(20);
        return { nodeId: inp.nodeId, data: "c" };
      },
    });
    engine.addEdge({ from: "A", to: "B" });
    engine.addEdge({ from: "A", to: "C" });
    engine.setEntryPoint("A");

    await engine.run("start", "sess-4", "key-4");

    // B와 C가 10ms 이내 차이로 시작 = 병렬 실행
    expect(Math.abs((startTimes["B"] ?? 0) - (startTimes["C"] ?? 0))).toBeLessThan(10);
  });

  it("루프 방지: maxExecutions 초과 시 오류를 던진다", async () => {
    const engine = new GraphEngine();
    engine.addNode({ id: "loop", handler: makeHandler({ count: 0 }) });
    engine.addEdge({ from: "loop", to: "loop" }); // 자기 루프
    engine.setEntryPoint("loop");
    engine.setMaxExecutions(3);

    await expect(engine.run("start", "sess-5", "key-5")).rejects.toThrow(/max.*executions/i);
  });

  it("사이클 감지: build() 시 사이클이 있으면 오류를 던진다", () => {
    const engine = new GraphEngine();
    engine.addNode({ id: "A", handler: makeHandler("a") });
    engine.addNode({ id: "B", handler: makeHandler("b") });
    // A→B→A 사이클 (자기 루프 제외한 진짜 사이클)
    engine.addEdge({ from: "A", to: "B" });
    engine.addEdge({ from: "B", to: "A" });
    engine.setEntryPoint("A");

    expect(() => engine.build()).toThrow(/cycle/i);
  });

  it("최종 출력: 마지막 노드의 output이 runResult.finalOutput에 담긴다", async () => {
    const engine = new GraphEngine();
    engine.addNode({ id: "only", handler: makeHandler("final-data") });
    engine.setEntryPoint("only");

    const result = await engine.run("input", "sess-6", "key-6");

    expect(result.finalOutput.data).toBe("final-data");
  });

  it("nodeOutputs: 모든 노드 실행 결과가 기록된다", async () => {
    const engine = new GraphEngine();
    engine.addNode({ id: "X", handler: makeHandler("x-out") });
    engine.addNode({ id: "Y", handler: makeHandler("y-out") });
    engine.addEdge({ from: "X", to: "Y" });
    engine.setEntryPoint("X");

    const result = await engine.run("input", "sess-7", "key-7");

    expect(result.nodeOutputs["X"]?.data).toBe("x-out");
    expect(result.nodeOutputs["Y"]?.data).toBe("y-out");
  });
});
