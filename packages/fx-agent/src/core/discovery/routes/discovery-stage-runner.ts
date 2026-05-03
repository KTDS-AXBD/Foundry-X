// Stub: autoTriggerMetaAgent for fx-agent test context
// Real implementation in packages/api/src/core/discovery/routes/discovery-stage-runner.ts

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

interface ProposalItem {
  type: string;
  title: string;
  reasoning: string;
  yamlDiff?: string;
}

export async function autoTriggerMetaAgent(
  db: D1Database,
  sessionId: string,
  apiKey: string,
  bizItemId?: string,
  metaAgentModel?: string,
): Promise<void> {
  const model = metaAgentModel ?? "claude-sonnet-4-6";

  // Collect metrics — check for high-token sessions
  let metrics: Array<{ input_tokens: number; rounds: number; stop_reason: string | null }>;
  if (bizItemId) {
    const result = await db
      .prepare(`SELECT input_tokens, rounds, stop_reason FROM agent_run_metrics WHERE session_id LIKE ? AND status = 'completed'`)
      .bind(`stage-%-${bizItemId}`)
      .all<{ input_tokens: number; rounds: number; stop_reason: string | null }>();
    metrics = result.results ?? [];
  } else {
    const result = await db
      .prepare(`SELECT input_tokens, rounds, stop_reason FROM agent_run_metrics WHERE session_id = ? AND status = 'completed'`)
      .bind(sessionId)
      .all<{ input_tokens: number; rounds: number; stop_reason: string | null }>();
    metrics = result.results ?? [];
  }

  if (!metrics.length) return;

  const totalTokens = metrics.reduce((s, m) => s + (m.input_tokens ?? 0), 0);
  const overallScore = Math.max(0, 100 - Math.floor(totalTokens / 1000));

  if (overallScore >= 70) return;

  // Call MetaAgent (mocked in tests via vi.stubGlobal fetch)
  let proposals: ProposalItem[];
  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: { "x-api-key": apiKey, "content-type": "application/json", "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        messages: [{ role: "user", content: `Score ${overallScore}. Suggest improvements.` }],
      }),
    });
    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    const text = data.content?.[0]?.text ?? "[]";
    proposals = JSON.parse(text) as ProposalItem[];
  } catch {
    return;
  }

  if (!proposals.length) return;

  for (const p of proposals) {
    const rubricScore = Math.min(100, overallScore + 20);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.prepare(
      `INSERT INTO agent_improvement_proposals (id, session_id, agent_id, type, title, reasoning, yaml_diff, status, rubric_score, created_at, updated_at)
       VALUES (?, ?, 'discovery-graph', ?, ?, ?, ?, 'pending', ?, ?, ?)`
    ).bind(id, sessionId, p.type, p.title, p.reasoning, p.yamlDiff ?? "", rubricScore, now, now).run();
  }
}
