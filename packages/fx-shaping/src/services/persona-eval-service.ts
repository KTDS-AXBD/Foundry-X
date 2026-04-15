/**
 * Sprint 155 F345: PersonaEvalService — 멀티 페르소나 AI 평가 실행 + SSE 스트림
 */
import { BIZ_PERSONAS } from "./biz-persona-prompts.js";
import { DEMO_EVAL_DATA, getDemoFinalResult } from "./persona-eval-demo.js";
import type { PersonaConfigInput } from "../schemas/persona-config.js";

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface PersonaEvalRow {
  id: string;
  item_id: string;
  org_id: string;
  persona_id: string;
  scores: string;
  verdict: string;
  summary: string | null;
  concerns: string | null;
  condition: string | null;
  eval_metadata: string | null;
  created_at: string;
}

const SCORE_KEYS = [
  "businessViability", "strategicFit", "customerValue", "techMarket",
  "execution", "financialFeasibility", "competitiveDiff", "scalability",
] as const;

export class PersonaEvalService {
  constructor(
    private db: D1Database,
    private apiKey?: string,
  ) {}

  async getByItemId(itemId: string, orgId: string): Promise<PersonaEvalRow[]> {
    const result = await this.db
      .prepare("SELECT * FROM ax_persona_evals WHERE item_id = ? AND org_id = ? ORDER BY persona_id")
      .bind(itemId, orgId)
      .all<PersonaEvalRow>();
    return result.results;
  }

  /** 아이템 ID로 전체 평가 조회 (orgId 불필요) */
  async getByItem(itemId: string): Promise<PersonaEvalRow[]> {
    const result = await this.db
      .prepare("SELECT * FROM ax_persona_evals WHERE item_id = ? ORDER BY persona_id")
      .bind(itemId)
      .all<PersonaEvalRow>();
    return result.results;
  }

  /** 단일 평가 결과 저장 (upsert) */
  async save(
    itemId: string,
    orgId: string,
    data: {
      personaId: string;
      scores: Record<string, number>;
      verdict: string;
      summary: string;
      concern?: string | null;
      condition?: string | null;
      evalModel?: string;
      evalDurationMs?: number;
      evalCostUsd?: number;
    },
  ): Promise<PersonaEvalRow> {
    const id = generateId();
    await this.db
      .prepare(
        `INSERT INTO ax_persona_evals (id, item_id, org_id, persona_id, scores, verdict, summary, concern, condition, eval_model, eval_duration_ms, eval_cost_usd)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(item_id, persona_id) DO UPDATE SET
           scores = excluded.scores,
           verdict = excluded.verdict,
           summary = excluded.summary,
           concern = excluded.concern,
           condition = excluded.condition,
           eval_model = excluded.eval_model,
           eval_duration_ms = excluded.eval_duration_ms,
           eval_cost_usd = excluded.eval_cost_usd`,
      )
      .bind(
        id, itemId, orgId, data.personaId,
        JSON.stringify(data.scores), data.verdict, data.summary,
        data.concern ?? null, data.condition ?? null,
        data.evalModel ?? null, data.evalDurationMs ?? null, data.evalCostUsd ?? null,
      )
      .run();

    return (await this.db
      .prepare("SELECT * FROM ax_persona_evals WHERE item_id = ? AND persona_id = ?")
      .bind(itemId, data.personaId)
      .first<PersonaEvalRow>())!;
  }

  /** 종합 판정 — 다수결 기반 */
  async getOverallVerdict(itemId: string): Promise<{
    verdict: string;
    go: number;
    conditional: number;
    noGo: number;
    avgScore: number;
    totalEvals: number;
  }> {
    const evals = await this.getByItem(itemId);

    if (evals.length === 0) {
      return { verdict: "Conditional", go: 0, conditional: 0, noGo: 0, avgScore: 0, totalEvals: 0 };
    }

    const counts = { Go: 0, Conditional: 0, NoGo: 0 };
    let scoreSum = 0;
    let scoreCount = 0;

    for (const e of evals) {
      if (e.verdict in counts) counts[e.verdict as keyof typeof counts]++;
      const scores = JSON.parse(e.scores) as Record<string, number>;
      const vals = Object.values(scores);
      scoreSum += vals.reduce((a, b) => a + b, 0);
      scoreCount += vals.length;
    }

    let verdict = "Conditional";
    if (counts.Go > counts.NoGo && counts.Go > counts.Conditional) verdict = "Go";
    else if (counts.NoGo >= counts.Go && counts.NoGo > 0) verdict = "NoGo";

    return {
      verdict,
      go: counts.Go,
      conditional: counts.Conditional,
      noGo: counts.NoGo,
      avgScore: scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : 0,
      totalEvals: evals.length,
    };
  }

  createEvalStream(
    itemId: string,
    orgId: string,
    configs: PersonaConfigInput[],
    briefing: string,
    demoMode: boolean,
  ): ReadableStream {
    const encoder = new TextEncoder();
    const db = this.db;
    const apiKey = this.apiKey;

    return new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          const results: Array<{ personaId: string; scores: Record<string, number>; verdict: string; summary: string | null; concerns: string[]; index: number }> = [];

          for (let i = 0; i < configs.length; i++) {
            const config = configs[i]!;
            const persona = BIZ_PERSONAS.find((p) => p.id === config.personaId);
            const personaName = persona?.name ?? config.personaId;

            send("eval_start", {
              personaId: config.personaId,
              personaName,
              index: i,
              total: configs.length,
            });

            let evalResult: {
              scores: Record<string, number>;
              verdict: string;
              summary: string | null;
              concerns: string[];
            };

            if (demoMode) {
              await new Promise((r) => setTimeout(r, 500));
              const demo = DEMO_EVAL_DATA[config.personaId];
              evalResult = demo
                ? { scores: demo.scores, verdict: demo.verdict, summary: demo.summary, concerns: demo.concerns }
                : { scores: Object.fromEntries(SCORE_KEYS.map((k) => [k, 7.0])), verdict: "keep", summary: "데모 데이터", concerns: [] };
            } else {
              evalResult = await evaluateWithClaude(config, briefing, apiKey!, itemId);
            }

            // DB에 결과 저장
            await db
              .prepare(
                `INSERT INTO ax_persona_evals (item_id, org_id, persona_id, scores, verdict, summary, concerns)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(item_id, persona_id) DO UPDATE SET
                   scores = excluded.scores,
                   verdict = excluded.verdict,
                   summary = excluded.summary,
                   concerns = excluded.concerns`,
              )
              .bind(
                itemId,
                orgId,
                config.personaId,
                JSON.stringify(evalResult.scores),
                evalResult.verdict,
                evalResult.summary,
                JSON.stringify(evalResult.concerns),
              )
              .run();

            const resultEntry = { ...evalResult, personaId: config.personaId, index: i };
            results.push(resultEntry);
            send("eval_complete", resultEntry);
          }

          // 종합 판정
          if (demoMode) {
            send("final_result", getDemoFinalResult());
          } else {
            send("final_result", computeFinalVerdict(results));
          }

          send("done", {});
        } catch (err) {
          send("error", { message: err instanceof Error ? err.message : "Unknown error" });
        } finally {
          controller.close();
        }
      },
    });
  }
}

/** Claude API로 단일 페르소나 평가 */
async function evaluateWithClaude(
  config: PersonaConfigInput,
  briefing: string,
  apiKey: string,
  itemId: string,
): Promise<{ scores: Record<string, number>; verdict: string; summary: string | null; concerns: string[] }> {
  const persona = BIZ_PERSONAS.find((p) => p.id === config.personaId);
  if (!persona) {
    return { scores: Object.fromEntries(SCORE_KEYS.map((k) => [k, 5.0])), verdict: "keep", summary: "Unknown persona", concerns: [] };
  }

  const systemPrompt = persona.systemPrompt;
  const userPrompt = `다음 사업 아이템에 대해 평가해주세요.

## 브리핑
${briefing || "(브리핑 없음)"}

## 평가 맥락
- 상황: ${config.context.situation || "일반"}
- 우선순위: ${config.context.priorities?.join(", ") || "없음"}
- 평가 스타일: ${config.context.style || "neutral"}
- Red Lines: ${config.context.redLines?.join(", ") || "없음"}

## 가중치 (참고용)
${Object.entries(config.weights).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

## 응답 형식 (반드시 JSON으로만 응답)
{
  "scores": {
    "businessViability": 0-10,
    "strategicFit": 0-10,
    "customerValue": 0-10,
    "techMarket": 0-10,
    "execution": 0-10,
    "financialFeasibility": 0-10,
    "competitiveDiff": 0-10,
    "scalability": 0-10
  },
  "verdict": "green|keep|red",
  "summary": "2-3문장 요약",
  "concerns": ["우려사항1", "우려사항2"]
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = (await response.json()) as { content: Array<{ type: string; text: string }> };
  const text = data.content[0]?.text ?? "{}";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[0] ?? "{}");
    return {
      scores: parsed.scores ?? Object.fromEntries(SCORE_KEYS.map((k) => [k, 5.0])),
      verdict: parsed.verdict ?? "keep",
      summary: parsed.summary ?? null,
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
    };
  } catch {
    return { scores: Object.fromEntries(SCORE_KEYS.map((k) => [k, 5.0])), verdict: "keep", summary: text.slice(0, 200), concerns: [] };
  }
}

/** 종합 판정 계산 */
function computeFinalVerdict(
  results: Array<{ personaId: string; scores: Record<string, number>; verdict: string; summary: string | null; concerns: string[] }>,
) {
  const allScores = results.flatMap((r) => Object.values(r.scores));
  const avgScore = Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10;
  const totalConcerns = results.reduce((s, r) => s + r.concerns.length, 0);

  const verdictCounts = { green: 0, keep: 0, red: 0 };
  for (const r of results) {
    if (r.verdict in verdictCounts) verdictCounts[r.verdict as keyof typeof verdictCounts]++;
  }

  let verdict: "green" | "keep" | "red" = "keep";
  if (verdictCounts.green >= 5) verdict = "green";
  else if (verdictCounts.red >= 3) verdict = "red";

  return {
    verdict,
    avgScore,
    totalConcerns,
    scores: results,
    warnings: totalConcerns > 10 ? ["다수의 우려사항이 제기되었습니다. 면밀한 검토가 필요합니다."] : [],
  };
}
