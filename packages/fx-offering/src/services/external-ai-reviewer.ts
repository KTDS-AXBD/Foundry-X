/**
 * Sprint 55 F186: 외부 AI PRD 검토 — Provider 인터페이스 + ChatGPT/Gemini/DeepSeek 구현
 */

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
  name: string;
  score: number;                  // 1-10
  grade: "충실" | "적정" | "최소" | "미흡";
  feedback: string;
}

// ─── Review Sections ───

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

// ─── Prompts ───

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

export function buildReviewUserPrompt(prdContent: string): string {
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

// ─── Response Parser ───

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

export function clampScore(v: unknown): number {
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

export function toVerdict(v: unknown): "go" | "conditional" | "reject" {
  const s = String(v).toLowerCase();
  if (s === "go") return "go";
  if (s === "reject") return "reject";
  return "conditional";
}

// ─── Response types for API parsing ───

interface OpenAiResponse {
  choices: Array<{ message: { content: string } }>;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

// ─── Provider 구현 ───

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
    return parseReviewResponse(data.choices[0]!.message.content);
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
    return parseReviewResponse(data.choices[0]!.message.content);
  }
}

// ─── Errors ───

export class ExternalAiError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "ExternalAiError";
  }
}
