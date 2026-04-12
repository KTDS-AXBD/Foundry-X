---
code: FX-DSGN-055
title: Sprint 55 — 다중 AI 검토 파이프라인 + 멀티 페르소나 PRD 평가 (F186, F187)
version: 0.1
status: Draft
category: DSGN
created: 2026-03-24
updated: 2026-03-24
author: Sinclair Seo
source: "[[FX-PLAN-055]]"
---

# Sprint 55 Design Document

> **Ref**: [[FX-PLAN-055]] Sprint 55 Plan
> **Scope**: F186 다중 AI 검토 파이프라인 + F187 멀티 페르소나 PRD 평가

---

## 1. System Architecture

### 1.1 전체 흐름

```
                   ┌─────────────────────────────────────────┐
                   │          biz-items Route                │
                   │  POST /:id/prd/:prdId/review            │
                   │  GET  /:id/prd/:prdId/reviews           │
                   │  POST /:id/prd/:prdId/persona-evaluate  │
                   │  GET  /:id/prd/:prdId/persona-evals     │
                   └──────┬──────────────┬───────────────────┘
                          │              │
              ┌───────────▼──┐    ┌──────▼──────────────┐
              │ PrdReview    │    │ BizPersonaEvaluator  │
              │ Pipeline     │    │ (PRD 모드 확장)       │
              └──────┬───────┘    └──────┬──────────────┘
                     │                   │
        ┌────────────┼────────────┐      │ Promise.allSettled
        │            │            │      │ (8 personas)
   ┌────▼───┐  ┌─────▼───┐  ┌────▼───┐  │
   │ChatGPT │  │ Gemini  │  │DeepSeek│  │
   │Provider│  │Provider │  │Provider│  │
   └────┬───┘  └─────┬───┘  └────┬───┘  │
        │            │            │      │
        └────────────┼────────────┘      │
                     │                   │
              ┌──────▼───────┐    ┌──────▼──────────────┐
              │  Scorecard   │    │   G/K/R Verdict      │
              │  Aggregator  │    │   (재사용)             │
              └──────┬───────┘    └──────┬──────────────┘
                     │                   │
              ┌──────▼───────────────────▼──────────────┐
              │               D1 Database               │
              │  prd_reviews · prd_review_scorecards     │
              │  prd_persona_evaluations ·               │
              │  prd_persona_verdicts                    │
              └─────────────────────────────────────────┘
```

### 1.2 기존 인프라 재사용 맵

| 기존 모듈 | Sprint | 재사용 방식 |
|-----------|--------|------------|
| `AgentRunner` interface | 10 | 내부 LLM(Anthropic) 호출에만 사용. 외부 AI는 별도 HTTP fetch |
| `BizPersonaEvaluator` | 51 | F187 — evaluatePrd() 메서드 추가 |
| `biz-persona-prompts.ts` | 51 | F187 — buildPrdEvaluationPrompt() 추가 |
| `PrdGeneratorService` | 53 | PRD content 조회 (getLatest/getByVersion) |
| `BizItemService` | 51 | 아이템 조회, orgId 검증 |
| `createMockD1()` | 7 | 테스트 DB 모킹 |

---

## 2. F186: 다중 AI 검토 파이프라인 — 상세 설계

### 2.1 ExternalAiReviewer

**파일**: `packages/api/src/services/external-ai-reviewer.ts`

```typescript
// ─── Provider Interface ───

export interface AiReviewProvider {
  readonly name: "chatgpt" | "gemini" | "deepseek";
  review(prdContent: string): Promise<AiReviewResponse>;
}

export interface AiReviewResponse {
  sections: SectionScore[];
  overallScore: number;           // 0-100
  verdict: "go" | "conditional" | "reject";
  summary: string;
  improvements: string[];
}

export interface SectionScore {
  name: string;                   // 검토 항목명
  score: number;                  // 1-10
  grade: "충실" | "적정" | "최소" | "미흡";
  feedback: string;
}

// ─── Review Sections (ax-req-interview 기준) ───

export const REVIEW_SECTIONS = [
  "핵심 문제 정의",
  "솔루션 설계",
  "시장 분석",
  "사용자/고객 정의",
  "기술 실현 가능성",
  "비즈니스 모델",
  "리스크 분석",
  "실행 계획",
] as const;

export type ReviewSectionName = typeof REVIEW_SECTIONS[number];

// ─── Provider 구현 (공통 패턴) ───

export class ChatGptProvider implements AiReviewProvider {
  readonly name = "chatgpt" as const;
  constructor(private apiKey: string) {}

  async review(prdContent: string): Promise<AiReviewResponse> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: REVIEW_SYSTEM_PROMPT },
          { role: "user", content: buildReviewUserPrompt(prdContent) },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new ExternalAiError(
        `ChatGPT API error: ${response.status}`,
        "CHATGPT_API_ERROR",
      );
    }

    const data = await response.json() as OpenAiResponse;
    return parseReviewResponse(data.choices[0].message.content);
  }
}

export class GeminiProvider implements AiReviewProvider {
  readonly name = "gemini" as const;
  constructor(private apiKey: string) {}

  async review(prdContent: string): Promise<AiReviewResponse> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${REVIEW_SYSTEM_PROMPT}\n\n${buildReviewUserPrompt(prdContent)}` }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      throw new ExternalAiError(
        `Gemini API error: ${response.status}`,
        "GEMINI_API_ERROR",
      );
    }

    const data = await response.json() as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return parseReviewResponse(text);
  }
}

export class DeepSeekProvider implements AiReviewProvider {
  readonly name = "deepseek" as const;
  constructor(private apiKey: string) {}

  async review(prdContent: string): Promise<AiReviewResponse> {
    // DeepSeek은 OpenAI-compatible API 사용
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: REVIEW_SYSTEM_PROMPT },
          { role: "user", content: buildReviewUserPrompt(prdContent) },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new ExternalAiError(
        `DeepSeek API error: ${response.status}`,
        "DEEPSEEK_API_ERROR",
      );
    }

    const data = await response.json() as OpenAiResponse;
    return parseReviewResponse(data.choices[0].message.content);
  }
}
```

**핵심 설계 결정:**
- **fetch 직접 사용**: Workers 환경에서 node_modules 의존 없이 `fetch`로 외부 API 호출. OpenAI SDK 사용하지 않음 (Workers 호환 문제 방지)
- **JSON 모드 강제**: 3개 AI 모두 JSON response format 지정하여 파싱 안정성 확보
- **gpt-4o-mini / gemini-2.0-flash / deepseek-chat**: 비용 효율적 모델 선택 (검토 품질 vs 비용 트레이드오프)

### 2.2 Review Prompt 설계

```typescript
// ─── System Prompt ───

export const REVIEW_SYSTEM_PROMPT = `당신은 사업개발 PRD를 전문적으로 검토하는 시니어 PM입니다.
PRD를 아래 8개 항목으로 평가하고, 각 항목에 1~10점 + 등급(충실/적정/최소/미흡) + 의견을 작성하세요.
또한 전체 종합 의견과 개선 권고사항을 제시하세요.

[평가 항목]
1. 핵심 문제 정의: As-Is/To-Be 명확성, 시급성 근거
2. 솔루션 설계: 문제-솔루션 적합성, 실현 가능성
3. 시장 분석: TAM/SAM/SOM, 경쟁사, 시장 트렌드
4. 사용자/고객 정의: 페르소나, JTBD, 세그먼트
5. 기술 실현 가능성: 기술 스택, 아키텍처, 제약사항
6. 비즈니스 모델: 수익 구조, 가격 전략, 원가 구조
7. 리스크 분석: 핵심 가정, 리스크 목록, 완화 방안
8. 실행 계획: 마일스톤, MVP 정의, 성공 기준

[등급 기준]
- 충실 (8-10): 충분한 근거와 구체적 데이터 포함
- 적정 (6-7): 기본 내용 충족, 일부 보완 필요
- 최소 (4-5): 내용은 있으나 깊이 부족
- 미흡 (1-3): 누락이거나 근거 없음

[출력 형식] 반드시 JSON으로만 응답하세요.`;

// ─── User Prompt Builder ───

export function buildReviewUserPrompt(prdContent: string): string {
  // PRD가 너무 길면 앞/뒤 각 3000자로 요약
  const maxLen = 8000;
  const trimmed = prdContent.length > maxLen
    ? prdContent.slice(0, maxLen / 2) + "\n\n[...중략...]\n\n" + prdContent.slice(-maxLen / 2)
    : prdContent;

  return `다음 PRD를 검토해주세요.

${trimmed}

[출력 JSON 형식]
{
  "sections": [
    { "name": "핵심 문제 정의", "score": 8, "grade": "충실", "feedback": "..." },
    ...8개 항목
  ],
  "overallScore": 72,
  "verdict": "conditional",
  "summary": "종합 의견 200자 이내",
  "improvements": ["개선 권고 1", "개선 권고 2", ...]
}`;
}
```

### 2.3 PrdReviewPipeline

**파일**: `packages/api/src/services/prd-review-pipeline.ts`

```typescript
import type { AiReviewProvider, AiReviewResponse } from "./external-ai-reviewer.js";
import { ChatGptProvider, GeminiProvider, DeepSeekProvider } from "./external-ai-reviewer.js";

export const MIN_REVIEW_SUCCESS = 2; // 3개 중 2개 이상 성공 필요

export interface PipelineResult {
  reviews: ProviderReview[];
  scorecard: Scorecard;
  failures: string[];
}

export interface ProviderReview {
  provider: string;
  response: AiReviewResponse;
}

export interface Scorecard {
  totalScore: number;              // 0-100 (성공한 AI 평균)
  verdict: "go" | "conditional" | "reject";
  providerCount: number;
  providerVerdicts: Array<{ name: string; verdict: string; score: number }>;
  sectionAverages: Array<{ name: string; avgScore: number; avgGrade: string }>;
}

export class PrdReviewPipeline {
  private providers: AiReviewProvider[];

  constructor(private db: D1Database, env: {
    OPENAI_API_KEY?: string;
    GOOGLE_AI_API_KEY?: string;
    DEEPSEEK_API_KEY?: string;
  }) {
    this.providers = [];
    if (env.OPENAI_API_KEY) this.providers.push(new ChatGptProvider(env.OPENAI_API_KEY));
    if (env.GOOGLE_AI_API_KEY) this.providers.push(new GeminiProvider(env.GOOGLE_AI_API_KEY));
    if (env.DEEPSEEK_API_KEY) this.providers.push(new DeepSeekProvider(env.DEEPSEEK_API_KEY));
  }

  get availableProviderCount(): number {
    return this.providers.length;
  }

  async execute(prdId: string, bizItemId: string, prdContent: string, orgId: string): Promise<PipelineResult> {
    if (this.providers.length === 0) {
      throw new PipelineError("No AI review providers configured", "NO_PROVIDERS");
    }

    // 병렬 호출
    const settled = await Promise.allSettled(
      this.providers.map((p) => p.review(prdContent)),
    );

    const reviews: ProviderReview[] = [];
    const failures: string[] = [];

    for (let i = 0; i < settled.length; i++) {
      const result = settled[i]!;
      const provider = this.providers[i]!;
      if (result.status === "fulfilled") {
        reviews.push({ provider: provider.name, response: result.value });
      } else {
        failures.push(`${provider.name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
      }
    }

    if (reviews.length < MIN_REVIEW_SUCCESS) {
      throw new PipelineError(
        `Insufficient reviews: ${reviews.length}/${this.providers.length} (minimum ${MIN_REVIEW_SUCCESS})`,
        "INSUFFICIENT_REVIEWS",
      );
    }

    // 스코어카드 집계
    const scorecard = this.aggregate(reviews);

    // DB 저장
    await this.saveReviews(prdId, bizItemId, orgId, reviews);
    await this.saveScorecard(prdId, scorecard);

    return { reviews, scorecard, failures };
  }

  private aggregate(reviews: ProviderReview[]): Scorecard {
    // 전체 점수 평균
    const totalScore = Math.round(
      reviews.reduce((sum, r) => sum + r.response.overallScore, 0) / reviews.length,
    );

    // Provider별 verdict
    const providerVerdicts = reviews.map((r) => ({
      name: r.provider,
      verdict: r.response.verdict,
      score: r.response.overallScore,
    }));

    // Section별 평균
    const sectionMap = new Map<string, { scores: number[]; grades: string[] }>();
    for (const review of reviews) {
      for (const section of review.response.sections) {
        const entry = sectionMap.get(section.name) ?? { scores: [], grades: [] };
        entry.scores.push(section.score);
        entry.grades.push(section.grade);
        sectionMap.set(section.name, entry);
      }
    }
    const sectionAverages = Array.from(sectionMap.entries()).map(([name, data]) => ({
      name,
      avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length * 10) / 10,
      avgGrade: this.modeGrade(data.grades),
    }));

    // 전체 verdict: Go/Conditional/Reject 다수결
    const verdictCounts = { go: 0, conditional: 0, reject: 0 };
    for (const r of reviews) verdictCounts[r.response.verdict]++;
    let verdict: "go" | "conditional" | "reject";
    if (verdictCounts.reject >= reviews.length / 2) verdict = "reject";
    else if (verdictCounts.go > reviews.length / 2) verdict = "go";
    else verdict = "conditional";

    return { totalScore, verdict, providerCount: reviews.length, providerVerdicts, sectionAverages };
  }

  private modeGrade(grades: string[]): string {
    const counts: Record<string, number> = {};
    for (const g of grades) counts[g] = (counts[g] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "적정";
  }

  private async saveReviews(prdId: string, bizItemId: string, orgId: string, reviews: ProviderReview[]): Promise<void> {
    for (const review of reviews) {
      const id = generateId();
      await this.db
        .prepare(
          `INSERT INTO prd_reviews (id, prd_id, biz_item_id, provider, verdict, score, feedback, raw_response, org_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id, prdId, bizItemId, review.provider,
          review.response.verdict, review.response.overallScore,
          JSON.stringify(review.response.sections),
          JSON.stringify(review.response),
          orgId,
        )
        .run();
    }
  }

  private async saveScorecard(prdId: string, scorecard: Scorecard): Promise<void> {
    const id = generateId();
    await this.db
      .prepare(
        `INSERT INTO prd_review_scorecards (id, prd_id, total_score, verdict, provider_count, details)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, prdId, scorecard.totalScore, scorecard.verdict, scorecard.providerCount, JSON.stringify(scorecard))
      .run();
  }

  async getReviews(prdId: string): Promise<{
    reviews: Array<{ provider: string; verdict: string; score: number; feedback: string; createdAt: string }>;
    scorecard: Scorecard | null;
  }> {
    const { results: reviewRows } = await this.db
      .prepare("SELECT provider, verdict, score, feedback, created_at FROM prd_reviews WHERE prd_id = ? ORDER BY created_at")
      .bind(prdId)
      .all<{ provider: string; verdict: string; score: number; feedback: string; created_at: string }>();

    const scorecardRow = await this.db
      .prepare("SELECT details FROM prd_review_scorecards WHERE prd_id = ? ORDER BY created_at DESC LIMIT 1")
      .bind(prdId)
      .first<{ details: string }>();

    return {
      reviews: reviewRows.map((r) => ({
        provider: r.provider,
        verdict: r.verdict,
        score: r.score,
        feedback: r.feedback,
        createdAt: r.created_at,
      })),
      scorecard: scorecardRow ? JSON.parse(scorecardRow.details) : null,
    };
  }
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class PipelineError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "PipelineError";
  }
}
```

### 2.4 JSON 파싱 유틸

```typescript
// parseReviewResponse — external-ai-reviewer.ts 내부

export function parseReviewResponse(raw: string): AiReviewResponse {
  let jsonStr = raw.trim();

  // code block 추출
  const codeMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) jsonStr = codeMatch[1]!.trim();

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new ExternalAiError("Failed to parse AI response as JSON", "PARSE_ERROR");
  }

  const sections: SectionScore[] = Array.isArray(parsed.sections)
    ? (parsed.sections as Array<Record<string, unknown>>).map((s) => ({
        name: String(s.name ?? ""),
        score: clampScore(s.score),
        grade: toGrade(clampScore(s.score)),
        feedback: String(s.feedback ?? ""),
      }))
    : [];

  return {
    sections,
    overallScore: clampOverall(parsed.overallScore),
    verdict: toVerdict(parsed.verdict),
    summary: String(parsed.summary ?? ""),
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String) : [],
  };
}

function clampScore(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 5 : Math.max(1, Math.min(10, Math.round(n)));
}

function clampOverall(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 50 : Math.max(0, Math.min(100, Math.round(n)));
}

function toGrade(score: number): SectionScore["grade"] {
  if (score >= 8) return "충실";
  if (score >= 6) return "적정";
  if (score >= 4) return "최소";
  return "미흡";
}

function toVerdict(v: unknown): "go" | "conditional" | "reject" {
  const s = String(v).toLowerCase();
  if (s === "go") return "go";
  if (s === "reject") return "reject";
  return "conditional";
}

export class ExternalAiError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "ExternalAiError";
  }
}
```

---

## 3. F187: 멀티 페르소나 PRD 평가 — 상세 설계

### 3.1 biz-persona-prompts.ts 확장

```typescript
// 기존 buildEvaluationPrompt() 유지 + 신규 추가

export function buildPrdEvaluationPrompt(
  persona: BizPersona,
  item: BizItem,
  prdContent: string,
): string {
  // PRD가 너무 길면 6000자로 트림
  const trimmedPrd = prdContent.length > 6000
    ? prdContent.slice(0, 3000) + "\n\n[...중략...]\n\n" + prdContent.slice(-3000)
    : prdContent;

  return `${persona.systemPrompt}

다음 사업 아이템의 PRD를 검토하고 평가해주세요.

[사업 아이템]
제목: ${item.title}
설명: ${item.description ?? "(설명 없음)"}

[PRD 전문]
${trimmedPrd}

[평가 기준 - 각 항목 1~10점]
1. 사업성/사업타당성 (businessViability)
2. 전략적합성 (strategicFit)
3. 고객가치 (customerValue)
4. 기술시장성 (techMarket)
5. 실행력/리스크 (execution)
6. 재무타당성 (financialFeasibility)
7. 경쟁차별화 (competitiveDiff)
8. 확장가능성 (scalability)

[출력 형식] 반드시 아래 JSON 형식으로만 응답하세요. JSON 외 텍스트를 포함하지 마세요.
{
  "businessViability": <1-10>,
  "strategicFit": <1-10>,
  "customerValue": <1-10>,
  "techMarket": <1-10>,
  "execution": <1-10>,
  "financialFeasibility": <1-10>,
  "competitiveDiff": <1-10>,
  "scalability": <1-10>,
  "summary": "<200자 이내 핵심 소견>",
  "concerns": ["<주요 쟁점 1>", "<주요 쟁점 2>"]
}`;
}
```

### 3.2 BizPersonaEvaluator PRD 모드 확장

```typescript
// biz-persona-evaluator.ts에 추가

export class BizPersonaEvaluator {
  // ... 기존 코드 유지 ...

  /**
   * PRD 대상 페르소나 평가 (F187).
   * 기존 evaluate()와 동일한 G/K/R 판정 로직 재사용.
   * 차이점: 프롬프트가 PRD 전문을 포함.
   */
  async evaluatePrd(
    item: BizItem,
    prdContent: string,
  ): Promise<EvaluationResult> {
    const settled = await Promise.allSettled(
      BIZ_PERSONAS.map((persona) => this.evaluatePersonaWithPrd(persona, item, prdContent)),
    );

    const scores: EvaluationScoreData[] = [];
    const failures: string[] = [];

    for (let i = 0; i < settled.length; i++) {
      const result = settled[i]!;
      const persona = BIZ_PERSONAS[i]!;
      if (result.status === "fulfilled") {
        scores.push(result.value);
      } else {
        failures.push(
          `${persona.name}(${persona.id}): ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
        );
      }
    }

    if (scores.length < MIN_SUCCESS_COUNT) {
      throw new EvaluationError(
        `Insufficient PRD evaluations: ${scores.length}/${BIZ_PERSONAS.length} (minimum ${MIN_SUCCESS_COUNT})`,
        "INSUFFICIENT_EVALUATIONS",
      );
    }

    const { verdict, avgScore, totalConcerns, warnings } = this.aggregateAndVerdict(scores);
    return { verdict, avgScore, totalConcerns, scores, warnings };
  }

  private async evaluatePersonaWithPrd(
    persona: BizPersona,
    item: BizItem,
    prdContent: string,
  ): Promise<EvaluationScoreData> {
    const prompt = buildPrdEvaluationPrompt(persona, item, prdContent);

    const result = await this.runner.execute({
      taskId: `prd-eval-${persona.id}-${item.id}`,
      agentId: `biz-persona-${persona.id}`,
      taskType: "policy-evaluation",
      context: {
        repoUrl: "",
        branch: "",
        instructions: prompt,
        systemPromptOverride: persona.systemPrompt,
      },
      constraints: [],
    });

    if (result.status === "failed") {
      throw new Error(`Persona ${persona.id} PRD evaluation failed`);
    }

    const rawText = result.output.analysis ?? "";
    return this.parseScoreResponse(rawText, persona);
  }

  // aggregateAndVerdict(), parseScoreResponse() — 기존 그대로 재사용
}
```

### 3.3 PRD 페르소나 평가 저장/조회

```typescript
// BizPersonaEvaluator 또는 별도 helper로 DB 저장

export async function savePrdPersonaEvaluations(
  db: D1Database,
  prdId: string,
  bizItemId: string,
  orgId: string,
  result: EvaluationResult,
): Promise<string> {
  // 개별 페르소나 점수 저장
  for (const score of result.scores) {
    const id = generateId();
    await db
      .prepare(
        `INSERT INTO prd_persona_evaluations
         (id, prd_id, biz_item_id, persona_id, persona_name,
          business_viability, strategic_fit, customer_value, tech_market,
          execution, financial_feasibility, competitive_diff, scalability,
          summary, concerns, org_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id, prdId, bizItemId, score.personaId, score.personaName,
        score.businessViability, score.strategicFit, score.customerValue,
        score.techMarket, score.execution, score.financialFeasibility,
        score.competitiveDiff, score.scalability,
        score.summary, JSON.stringify(score.concerns), orgId,
      )
      .run();
  }

  // Verdict 저장
  const verdictId = generateId();
  await db
    .prepare(
      `INSERT INTO prd_persona_verdicts
       (id, prd_id, verdict, avg_score, total_concerns, warnings, evaluation_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      verdictId, prdId, result.verdict, result.avgScore,
      result.totalConcerns, JSON.stringify(result.warnings),
      result.scores.length,
    )
    .run();

  return verdictId;
}

export async function getPrdPersonaEvaluations(
  db: D1Database,
  prdId: string,
): Promise<{
  evaluations: EvaluationScoreData[];
  verdict: { verdict: string; avgScore: number; totalConcerns: number; warnings: string[] } | null;
}> {
  const { results: evalRows } = await db
    .prepare(
      `SELECT persona_id, persona_name,
              business_viability, strategic_fit, customer_value, tech_market,
              execution, financial_feasibility, competitive_diff, scalability,
              summary, concerns
       FROM prd_persona_evaluations WHERE prd_id = ? ORDER BY persona_id`,
    )
    .bind(prdId)
    .all();

  const verdictRow = await db
    .prepare("SELECT verdict, avg_score, total_concerns, warnings FROM prd_persona_verdicts WHERE prd_id = ? ORDER BY created_at DESC LIMIT 1")
    .bind(prdId)
    .first<{ verdict: string; avg_score: number; total_concerns: number; warnings: string }>();

  return {
    evaluations: evalRows.map((r: any) => ({
      personaId: r.persona_id,
      personaName: r.persona_name,
      businessViability: r.business_viability,
      strategicFit: r.strategic_fit,
      customerValue: r.customer_value,
      techMarket: r.tech_market,
      execution: r.execution,
      financialFeasibility: r.financial_feasibility,
      competitiveDiff: r.competitive_diff,
      scalability: r.scalability,
      summary: r.summary,
      concerns: JSON.parse(r.concerns),
    })),
    verdict: verdictRow
      ? {
          verdict: verdictRow.verdict,
          avgScore: verdictRow.avg_score,
          totalConcerns: verdictRow.total_concerns,
          warnings: JSON.parse(verdictRow.warnings),
        }
      : null,
  };
}
```

---

## 4. D1 Migrations

### 4.1 0038_prd_reviews.sql

```sql
-- 0038_prd_reviews.sql
-- Sprint 55: 다중 AI 검토 결과 저장 (F186)

CREATE TABLE IF NOT EXISTS prd_reviews (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  prd_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  verdict TEXT NOT NULL,
  score INTEGER NOT NULL,
  feedback TEXT NOT NULL,
  raw_response TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  org_id TEXT NOT NULL,
  FOREIGN KEY (prd_id) REFERENCES biz_generated_prds(id) ON DELETE CASCADE,
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_prd_reviews_prd ON prd_reviews(prd_id);

CREATE TABLE IF NOT EXISTS prd_review_scorecards (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  prd_id TEXT NOT NULL,
  total_score INTEGER NOT NULL,
  verdict TEXT NOT NULL,
  provider_count INTEGER NOT NULL,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (prd_id) REFERENCES biz_generated_prds(id) ON DELETE CASCADE
);

CREATE INDEX idx_prd_scorecards_prd ON prd_review_scorecards(prd_id);
```

### 4.2 0039_prd_persona_evaluations.sql

```sql
-- 0039_prd_persona_evaluations.sql
-- Sprint 55: 멀티 페르소나 PRD 평가 결과 저장 (F187)

CREATE TABLE IF NOT EXISTS prd_persona_evaluations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  prd_id TEXT NOT NULL,
  biz_item_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  persona_name TEXT NOT NULL,
  business_viability INTEGER NOT NULL,
  strategic_fit INTEGER NOT NULL,
  customer_value INTEGER NOT NULL,
  tech_market INTEGER NOT NULL,
  execution INTEGER NOT NULL,
  financial_feasibility INTEGER NOT NULL,
  competitive_diff INTEGER NOT NULL,
  scalability INTEGER NOT NULL,
  summary TEXT NOT NULL,
  concerns TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  org_id TEXT NOT NULL,
  FOREIGN KEY (prd_id) REFERENCES biz_generated_prds(id) ON DELETE CASCADE,
  FOREIGN KEY (biz_item_id) REFERENCES biz_items(id) ON DELETE CASCADE
);

CREATE INDEX idx_prd_persona_evals_prd ON prd_persona_evaluations(prd_id);

CREATE TABLE IF NOT EXISTS prd_persona_verdicts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  prd_id TEXT NOT NULL,
  verdict TEXT NOT NULL,
  avg_score REAL NOT NULL,
  total_concerns INTEGER NOT NULL,
  warnings TEXT NOT NULL,
  evaluation_count INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (prd_id) REFERENCES biz_generated_prds(id) ON DELETE CASCADE
);

CREATE INDEX idx_prd_persona_verdicts_prd ON prd_persona_verdicts(prd_id);
```

---

## 5. API Routes

### 5.1 신규 엔드포인트 (biz-items.ts 확장)

```typescript
// ─── POST /biz-items/:id/prd/:prdId/review — 다중 AI 검토 시작 (F186) ───

bizItemsRoute.post("/biz-items/:id/prd/:prdId/review", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const prdId = c.req.param("prdId");

  // 아이템 존재 확인
  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  // PRD 존재 확인
  const prdService = new PrdGeneratorService(c.env.DB, null as any);
  const prd = await prdService.getLatest(id);
  if (!prd || prd.id !== prdId) return c.json({ error: "PRD_NOT_FOUND" }, 404);

  // 파이프라인 실행
  const pipeline = new PrdReviewPipeline(c.env.DB, {
    OPENAI_API_KEY: c.env.OPENAI_API_KEY,
    GOOGLE_AI_API_KEY: c.env.GOOGLE_AI_API_KEY,
    DEEPSEEK_API_KEY: c.env.DEEPSEEK_API_KEY,
  });

  if (pipeline.availableProviderCount === 0) {
    return c.json({ error: "NO_REVIEW_PROVIDERS", message: "No AI API keys configured" }, 503);
  }

  try {
    const result = await pipeline.execute(prdId, id, prd.content, orgId);
    return c.json(result, 201);
  } catch (e) {
    if (e instanceof PipelineError) {
      return c.json({ error: e.code, message: e.message }, 502);
    }
    throw e;
  }
});

// ─── GET /biz-items/:id/prd/:prdId/reviews — 검토 결과 조회 (F186) ───

bizItemsRoute.get("/biz-items/:id/prd/:prdId/reviews", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const prdId = c.req.param("prdId");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const pipeline = new PrdReviewPipeline(c.env.DB, {});
  const result = await pipeline.getReviews(prdId);

  if (result.reviews.length === 0) return c.json({ error: "REVIEWS_NOT_FOUND" }, 404);

  return c.json(result);
});

// ─── POST /biz-items/:id/prd/:prdId/persona-evaluate — PRD 페르소나 평가 (F187) ───

bizItemsRoute.post("/biz-items/:id/prd/:prdId/persona-evaluate", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const prdId = c.req.param("prdId");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const prdService = new PrdGeneratorService(c.env.DB, null as any);
  const prd = await prdService.getLatest(id);
  if (!prd || prd.id !== prdId) return c.json({ error: "PRD_NOT_FOUND" }, 404);

  const runner = createAgentRunner(c.env);
  const evaluator = new BizPersonaEvaluator(runner, c.env.DB);

  try {
    const result = await evaluator.evaluatePrd(
      { id: item.id, title: item.title, description: item.description, source: item.source, status: item.status, orgId: item.orgId, createdBy: item.createdBy },
      prd.content,
    );

    const verdictId = await savePrdPersonaEvaluations(c.env.DB, prdId, id, orgId, result);

    return c.json({
      verdictId,
      prdId,
      bizItemId: id,
      verdict: result.verdict,
      avgScore: result.avgScore,
      totalConcerns: result.totalConcerns,
      scores: result.scores,
      warnings: result.warnings,
    }, 201);
  } catch (e) {
    if (e instanceof EvaluationError) {
      return c.json({ error: e.code, message: e.message }, 502);
    }
    throw e;
  }
});

// ─── GET /biz-items/:id/prd/:prdId/persona-evaluations — 페르소나 평가 결과 조회 (F187) ───

bizItemsRoute.get("/biz-items/:id/prd/:prdId/persona-evaluations", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const prdId = c.req.param("prdId");

  const bizService = new BizItemService(c.env.DB);
  const item = await bizService.getById(orgId, id);
  if (!item) return c.json({ error: "BIZ_ITEM_NOT_FOUND" }, 404);

  const result = await getPrdPersonaEvaluations(c.env.DB, prdId);

  if (result.evaluations.length === 0) return c.json({ error: "PERSONA_EVALUATIONS_NOT_FOUND" }, 404);

  return c.json(result);
});
```

### 5.2 env.ts 확장

```typescript
export type Env = {
  // ... 기존 ...
  // Sprint 55: 외부 AI API
  OPENAI_API_KEY?: string;
  GOOGLE_AI_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
};
```

### 5.3 Zod 스키마

**파일**: `packages/api/src/schemas/prd-review.ts`

```typescript
import { z } from "@hono/zod-openapi";

export const PrdReviewResponseSchema = z.object({
  reviews: z.array(z.object({
    provider: z.string(),
    response: z.object({
      sections: z.array(z.object({
        name: z.string(),
        score: z.number().int().min(1).max(10),
        grade: z.enum(["충실", "적정", "최소", "미흡"]),
        feedback: z.string(),
      })),
      overallScore: z.number().int().min(0).max(100),
      verdict: z.enum(["go", "conditional", "reject"]),
      summary: z.string(),
      improvements: z.array(z.string()),
    }),
  })),
  scorecard: z.object({
    totalScore: z.number().int().min(0).max(100),
    verdict: z.enum(["go", "conditional", "reject"]),
    providerCount: z.number().int(),
    providerVerdicts: z.array(z.object({
      name: z.string(),
      verdict: z.string(),
      score: z.number(),
    })),
    sectionAverages: z.array(z.object({
      name: z.string(),
      avgScore: z.number(),
      avgGrade: z.string(),
    })),
  }),
  failures: z.array(z.string()),
}).openapi("PrdReviewResponse");
```

**파일**: `packages/api/src/schemas/prd-persona.ts`

```typescript
import { z } from "@hono/zod-openapi";

export const PrdPersonaEvaluationResponseSchema = z.object({
  verdictId: z.string(),
  prdId: z.string(),
  bizItemId: z.string(),
  verdict: z.enum(["green", "keep", "red"]),
  avgScore: z.number(),
  totalConcerns: z.number().int(),
  scores: z.array(z.object({
    personaId: z.string(),
    personaName: z.string(),
    businessViability: z.number().int().min(1).max(10),
    strategicFit: z.number().int().min(1).max(10),
    customerValue: z.number().int().min(1).max(10),
    techMarket: z.number().int().min(1).max(10),
    execution: z.number().int().min(1).max(10),
    financialFeasibility: z.number().int().min(1).max(10),
    competitiveDiff: z.number().int().min(1).max(10),
    scalability: z.number().int().min(1).max(10),
    summary: z.string(),
    concerns: z.array(z.string()),
  })),
  warnings: z.array(z.string()),
}).openapi("PrdPersonaEvaluationResponse");
```

---

## 6. Web Components

### 6.1 ScorecardView (F186)

**파일**: `packages/web/src/components/feature/ScorecardView.tsx`

```tsx
"use client";

interface ScorecardViewProps {
  reviews: Array<{
    provider: string;
    verdict: string;
    score: number;
    feedback: string;
  }>;
  scorecard: {
    totalScore: number;
    verdict: string;
    sectionAverages: Array<{ name: string; avgScore: number; avgGrade: string }>;
  } | null;
  onRefresh: () => void;
}

// UI 구성:
// - 전체 verdict 배지 (Go/Conditional/Reject) + 점수
// - AI별 카드 (provider명 + 점수 + verdict 배지)
// - 항목별 점수 바 차트 (8개 항목 × 평균 점수)
// - 개선 권고 목록
```

### 6.2 RadarChartPanel (F187)

**파일**: `packages/web/src/components/feature/RadarChartPanel.tsx`

```tsx
"use client";

interface RadarChartPanelProps {
  evaluations: Array<{
    personaId: string;
    personaName: string;
    businessViability: number;
    strategicFit: number;
    customerValue: number;
    techMarket: number;
    execution: number;
    financialFeasibility: number;
    competitiveDiff: number;
    scalability: number;
    summary: string;
    concerns: string[];
  }>;
  verdict: { verdict: string; avgScore: number; warnings: string[] } | null;
}

// UI 구성:
// - G/K/R 판정 배지 (큰 원형) + 평균 점수
// - SVG 기반 레이더 차트 (8축, 페르소나별 오버레이)
// - 페르소나별 쟁점 카드 (아코디언)
// - 경고 배너 (warnings)
// 주의: 외부 차트 라이브러리 없이 SVG 직접 렌더 (의존성 최소화)
```

### 6.3 PrdReviewSummary (통합)

**파일**: `packages/web/src/components/feature/PrdReviewSummary.tsx`

```tsx
"use client";

import ScorecardView from "./ScorecardView";
import RadarChartPanel from "./RadarChartPanel";

interface PrdReviewSummaryProps {
  prdId: string;
  bizItemId: string;
}

// UI 구성:
// - 탭: "AI 검토" | "페르소나 평가"
// - AI 검토 탭 → ScorecardView
// - 페르소나 평가 탭 → RadarChartPanel
// - "AI 검토 시작" / "페르소나 평가 시작" 버튼 (아직 결과 없을 때)
// - 로딩 상태 처리
```

---

## 7. Test Strategy

### 7.1 서비스 테스트

| 테스트 파일 | 대상 | 주요 시나리오 |
|------------|------|-------------|
| `external-ai-reviewer.test.ts` | Provider + 파싱 | JSON 파싱 성공/실패, code block 추출, clampScore, toVerdict, API 에러 |
| `prd-review-pipeline.test.ts` | 파이프라인 | 3개 성공, 2개 성공 + 1 실패, 모두 실패, 스코어카드 집계, verdict 다수결, DB 저장/조회 |
| `prd-persona-evaluator.test.ts` | PRD 평가 확장 | evaluatePrd 성공, 5/8 성공 최소 조건, buildPrdEvaluationPrompt 포맷, DB 저장/조회 |

### 7.2 라우트 테스트

| 테스트 파일 | 대상 | 주요 시나리오 |
|------------|------|-------------|
| `biz-items-prd-review.test.ts` | POST/GET review | 아이템 404, PRD 404, provider 없음 503, 성공 201, 결과 조회 |
| `biz-items-prd-persona.test.ts` | POST/GET persona-evaluate | 아이템 404, PRD 404, 성공 201, 결과 조회, G/K/R verdict 검증 |

### 7.3 Web 테스트

| 테스트 파일 | 대상 | 주요 시나리오 |
|------------|------|-------------|
| `scorecard-view.test.tsx` | ScorecardView | verdict 배지 렌더, 점수 바 렌더, 빈 상태 |
| `radar-chart-panel.test.tsx` | RadarChartPanel | G/K/R 배지, SVG 레이더 축, 페르소나 카드 |
| `prd-review-summary.test.tsx` | PrdReviewSummary | 탭 전환, 버튼 클릭, 로딩 상태 |

### 7.4 Mock 전략

- **외부 AI API**: `vi.fn()`으로 `fetch` 모킹. 각 Provider는 실제 HTTP 호출하므로 `globalThis.fetch` 모킹
- **AgentRunner**: 기존 `mockRunner()` 패턴 재사용 (prd-generator.test.ts 참조)
- **D1**: `createMockD1()` 재사용 + 신규 테이블 SQL 추가

---

## 8. Implementation Checklist

### Phase A: F186 다중 AI 검토 (순서 의존)

- [ ] **A-1** `packages/api/src/db/migrations/0038_prd_reviews.sql` 생성
- [ ] **A-2** `packages/api/src/services/external-ai-reviewer.ts` — Provider 3종 + 파싱 유틸
- [ ] **A-3** `packages/api/src/services/prd-review-pipeline.ts` — 오케스트레이터 + 스코어카드
- [ ] **A-4** `packages/api/src/schemas/prd-review.ts` — Zod 스키마
- [ ] **A-5** `packages/api/src/env.ts` — 3개 API 키 추가
- [ ] **A-6** `packages/api/src/routes/biz-items.ts` — POST review + GET reviews 추가
- [ ] **A-7** `packages/api/src/__tests__/external-ai-reviewer.test.ts`
- [ ] **A-8** `packages/api/src/__tests__/prd-review-pipeline.test.ts`
- [ ] **A-9** `packages/api/src/__tests__/biz-items-prd-review.test.ts`

### Phase B: F187 멀티 페르소나 PRD 평가 (A와 병렬 가능)

- [ ] **B-1** `packages/api/src/db/migrations/0039_prd_persona_evaluations.sql` 생성
- [ ] **B-2** `packages/api/src/services/biz-persona-prompts.ts` — buildPrdEvaluationPrompt() 추가
- [ ] **B-3** `packages/api/src/services/biz-persona-evaluator.ts` — evaluatePrd() + savePrdPersonaEvaluations() + getPrdPersonaEvaluations()
- [ ] **B-4** `packages/api/src/schemas/prd-persona.ts` — Zod 스키마
- [ ] **B-5** `packages/api/src/routes/biz-items.ts` — POST persona-evaluate + GET persona-evaluations 추가
- [ ] **B-6** `packages/api/src/__tests__/prd-persona-evaluator.test.ts`
- [ ] **B-7** `packages/api/src/__tests__/biz-items-prd-persona.test.ts`

### Phase C: 대시보드 UI

- [ ] **C-1** `packages/web/src/components/feature/ScorecardView.tsx`
- [ ] **C-2** `packages/web/src/components/feature/RadarChartPanel.tsx`
- [ ] **C-3** `packages/web/src/components/feature/PrdReviewSummary.tsx`
- [ ] **C-4** `packages/web/src/__tests__/scorecard-view.test.tsx`
- [ ] **C-5** `packages/web/src/__tests__/radar-chart-panel.test.tsx`
- [ ] **C-6** `packages/web/src/__tests__/prd-review-summary.test.tsx`

---

## 9. Error Handling

| 에러 | HTTP | 코드 | 처리 |
|------|------|------|------|
| AI API 키 미설정 | 503 | NO_REVIEW_PROVIDERS | Pipeline 생성 시 provider 0개 감지 |
| AI API 호출 실패 | — | Provider-specific | Promise.allSettled로 개별 실패 허용, 2/3 이상 성공 필요 |
| JSON 파싱 실패 | — | PARSE_ERROR | clamp/fallback 값으로 보정 시도 |
| 2/3 미만 성공 | 502 | INSUFFICIENT_REVIEWS | 실패한 provider 목록과 함께 에러 반환 |
| PRD 미존재 | 404 | PRD_NOT_FOUND | 생성 먼저 안내 |
| 페르소나 5/8 미달 | 502 | INSUFFICIENT_EVALUATIONS | 기존 BizPersonaEvaluator 에러 재사용 |

---

## 10. Env / Secrets

| Secret | Workers 등록 | 필수 여부 | 용도 |
|--------|-------------|----------|------|
| `OPENAI_API_KEY` | `wrangler secret put` | 선택 | ChatGPT 검토 |
| `GOOGLE_AI_API_KEY` | `wrangler secret put` | 선택 | Gemini 검토 |
| `DEEPSEEK_API_KEY` | `wrangler secret put` | 선택 | DeepSeek 검토 |

> 3개 중 최소 2개 설정 필요. 1개 이하이면 POST review가 503 반환.
> 페르소나 평가(F187)는 기존 ANTHROPIC_API_KEY만 사용하므로 추가 설정 불필요.
