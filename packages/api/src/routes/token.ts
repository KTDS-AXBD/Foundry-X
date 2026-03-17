import { Hono } from "hono";
import type { TokenUsage, TokenSummary } from "@foundry-x/shared";
import { foundryXPath, readTextFile } from "../services/data-reader.js";

export const tokenRoute = new Hono();

// ─── JSONL Parser ───

function parseJsonl(raw: string): TokenUsage[] {
  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as TokenUsage);
}

function summarize(records: TokenUsage[], period: string): TokenSummary {
  const byModel: Record<string, { tokens: number; cost: number }> = {};
  const byAgent: Record<string, { tokens: number; cost: number }> = {};
  let totalCost = 0;

  for (const r of records) {
    totalCost += r.cost;
    const tokens = r.inputTokens + r.outputTokens;

    const m = byModel[r.model] ?? { tokens: 0, cost: 0 };
    m.tokens += tokens;
    m.cost += r.cost;
    byModel[r.model] = m;

    if (r.agentId) {
      const a = byAgent[r.agentId] ?? { tokens: 0, cost: 0 };
      a.tokens += tokens;
      a.cost += r.cost;
      byAgent[r.agentId] = a;
    }
  }

  return { period, totalCost: Math.round(totalCost * 100) / 100, byModel, byAgent };
}

// ─── Mock Data ───

const MOCK_USAGE: TokenUsage[] = [
  { model: "claude-opus-4", inputTokens: 8200, outputTokens: 3100, cost: 4.80, timestamp: "2026-03-17T10:00:00Z", agentId: "agent-code-review" },
  { model: "claude-opus-4", inputTokens: 6500, outputTokens: 2800, cost: 3.70, timestamp: "2026-03-17T09:30:00Z", agentId: "agent-test-writer" },
  { model: "claude-sonnet-4", inputTokens: 4000, outputTokens: 1500, cost: 2.10, timestamp: "2026-03-17T09:00:00Z", agentId: "agent-code-review" },
  { model: "claude-sonnet-4", inputTokens: 3200, outputTokens: 1200, cost: 1.90, timestamp: "2026-03-17T08:30:00Z", agentId: "agent-test-writer" },
];

const MOCK_SUMMARY: TokenSummary = {
  period: "2026-03",
  totalCost: 12.50,
  byModel: {
    "claude-opus-4": { tokens: 20600, cost: 8.50 },
    "claude-sonnet-4": { tokens: 9900, cost: 4.00 },
  },
  byAgent: {
    "agent-code-review": { tokens: 16800, cost: 6.90 },
    "agent-test-writer": { tokens: 13700, cost: 5.60 },
  },
};

// ─── Routes ───

tokenRoute.get("/tokens/summary", async (c) => {
  const raw = await readTextFile(foundryXPath("token-usage.jsonl"), "");

  if (raw.length === 0) {
    return c.json(MOCK_SUMMARY);
  }

  const records = parseJsonl(raw);
  const now = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return c.json(summarize(records, period));
});

tokenRoute.get("/tokens/usage", async (c) => {
  const raw = await readTextFile(foundryXPath("token-usage.jsonl"), "");

  if (raw.length === 0) {
    return c.json(MOCK_USAGE);
  }

  const records = parseJsonl(raw);
  return c.json(records.slice(-20));
});
