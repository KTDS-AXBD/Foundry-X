import { Hono } from "hono";
import type {
  AgentProfile,
  AgentCapability,
  AgentConstraint,
  AgentActivity,
} from "@foundry-x/shared";
import { readJsonFile, foundryXPath } from "../services/data-reader.js";

export const agentRoute = new Hono();

// ─── Mock Data ───

const MOCK_AGENTS: AgentProfile[] = [
  {
    id: "agent-code-review",
    name: "Code Review Agent",
    capabilities: [
      { action: "review", scope: "pull-request", tools: ["eslint", "prettier"] },
      { action: "suggest", scope: "refactoring", tools: ["ast-grep", "jscodeshift"] },
    ],
    constraints: [
      { tier: "always", rule: "Run lint before review", reason: "Catches trivial issues early" },
      { tier: "ask", rule: "Auto-fix formatting", reason: "May conflict with team style preferences" },
      { tier: "never", rule: "Push directly to main", reason: "Branch protection policy" },
    ],
    activity: { status: "idle" },
  },
  {
    id: "agent-test-writer",
    name: "Test Writer Agent",
    capabilities: [
      { action: "generate", scope: "unit-test", tools: ["vitest", "testing-library"] },
      { action: "analyze", scope: "coverage", tools: ["v8", "istanbul"] },
    ],
    constraints: [
      { tier: "always", rule: "Match existing test patterns", reason: "Consistency with codebase conventions" },
      { tier: "ask", rule: "Add snapshot tests", reason: "Snapshots can be brittle and noisy" },
      { tier: "never", rule: "Delete existing tests", reason: "May remove intentional regression guards" },
    ],
    activity: {
      status: "running",
      currentTask: "Generating tests for harness/builders",
      startedAt: "2026-03-17T09:00:00Z",
      progress: 65,
      tokenUsed: 2400,
    },
  },
];

// ─── Routes ───

agentRoute.get("/agents", async (c) => {
  const agents = await readJsonFile<AgentProfile[]>(
    foundryXPath("agents.json"),
    MOCK_AGENTS,
  );
  return c.json(agents);
});

agentRoute.get("/agents/stream", (c) => {
  const encoder = new TextEncoder();
  let timerId: ReturnType<typeof setInterval> | undefined;

  const readable = new ReadableStream({
    start(controller) {
      const send = () => {
        const agentId = Math.random() > 0.5 ? "agent-code-review" : "agent-test-writer";
        const statuses = ["idle", "running", "waiting", "completed"] as const;
        const status = statuses[Math.floor(Math.random() * statuses.length)] ?? "idle";

        const activity: AgentActivity = {
          status,
          currentTask: status === "running" ? "Processing files..." : undefined,
          progress: status === "running" ? Math.floor(Math.random() * 100) : undefined,
          tokenUsed: Math.floor(Math.random() * 5000),
        };

        const data = JSON.stringify({ agentId, activity, timestamp: new Date().toISOString() });
        controller.enqueue(encoder.encode(`event: activity\ndata: ${data}\n\n`));
      };

      send();
      timerId = setInterval(send, 5000);
    },
    cancel() {
      if (timerId) clearInterval(timerId);
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
