import { OpenRouterService, type ChatMessage } from "./openrouter-service.js";

export interface ChatParams {
  tenantId: string;
  userId: string;
  message: string;
  conversationId: string;
  bizItemId?: string;
  stage?: string;
}

interface LocalPattern {
  regex: RegExp;
  handler: (stage?: string) => string;
}

// ─── BD 프로세스 2단계 발굴 단계 정보 ───
const STAGE_INFO: Record<string, { name: string; desc: string; skills: string[] }> = {
  "2-0": { name: "사전 분류", desc: "아이템 유형(I/M/P/T/S) 분류 및 강도 결정", skills: ["유형 분류 매트릭스"] },
  "2-1": { name: "문제 정의", desc: "해결할 문제의 본질 파악, 고객 Pain Point 정리", skills: ["JTBD", "5 Whys", "Problem Statement Canvas"] },
  "2-2": { name: "시장 분석", desc: "TAM/SAM/SOM 추정, 경쟁사 분석", skills: ["Market Sizing", "Competitor Analysis", "Porter 5 Forces"] },
  "2-3": { name: "솔루션 설계", desc: "가치 제안 정의, MVP 범위 설정", skills: ["Value Proposition Canvas", "Lean Canvas", "BMC"] },
  "2-4": { name: "검증 계획", desc: "가설 수립, 실험 설계, 성공 지표 정의", skills: ["Hypothesis Canvas", "Experiment Design"] },
  "2-5": { name: "Commit Gate", desc: "4대 질문 기반 투자 결정 (Go/Pivot/Drop)", skills: ["Commit Gate 4Q", "누적 신호등"] },
  "2-6": { name: "프로토타입", desc: "MVP 구축, 초기 사용자 테스트", skills: ["Prototype Builder", "Usability Test"] },
  "2-7": { name: "GTM 준비", desc: "Go-to-Market 전략 수립, 런칭 준비", skills: ["GTM Canvas", "Launch Checklist"] },
};

const LOCAL_PATTERNS: LocalPattern[] = [
  {
    regex: /다음.*(단계|스텝)|next.*step/i,
    handler: (stage) => {
      const stageNum = parseStageNum(stage);
      const nextKey = `2-${stageNum + 1}`;
      const next = STAGE_INFO[nextKey];
      if (!next) return "현재 마지막 단계(2-7 GTM 준비)에 있어요. 모든 발굴 단계가 완료되었어요!";
      return `다음 단계는 **${nextKey} ${next.name}**이에요.\n\n${next.desc}\n\n추천 스킬: ${next.skills.join(", ")}`;
    },
  },
  {
    regex: /(이|현재).*(단계|스텝).*뭐|what.*(this|current).*stage/i,
    handler: (stage) => {
      const key = stage || "2-0";
      const info = STAGE_INFO[key];
      if (!info) return `현재 단계 정보를 찾을 수 없어요. (stage: ${key})`;
      return `현재 **${key} ${info.name}** 단계예요.\n\n${info.desc}\n\n사용 가능한 스킬: ${info.skills.join(", ")}`;
    },
  },
  {
    regex: /스킬.*추천|recommend.*skill/i,
    handler: (stage) => {
      const key = stage || "2-0";
      const info = STAGE_INFO[key];
      if (!info) return "현재 단계에 맞는 스킬 정보가 없어요.";
      return `**${key} ${info.name}** 단계에서 추천하는 스킬:\n\n${info.skills.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
    },
  },
  {
    regex: /체크포인트|checkpoint/i,
    handler: () => {
      return `**사업성 체크포인트 (2-1 ~ 2-7)**\n\n각 단계 완료 시 Go/Pivot/Drop 결정을 내려요.\n\n특히 **2-5 Commit Gate**에서는 4대 질문으로 최종 투자 결정을 해요:\n1. 이 문제가 충분히 크고 급한가?\n2. 우리가 풀 수 있는 역량이 있는가?\n3. 시장 타이밍이 맞는가?\n4. 수익 모델이 지속 가능한가?`;
    },
  },
];

function parseStageNum(stage?: string): number {
  if (!stage) return 0;
  const match = stage.match(/2-(\d)/);
  return match?.[1] ? parseInt(match[1], 10) : 0;
}

export class HelpAgentService {
  constructor(
    private db: D1Database,
    private openRouter: OpenRouterService,
  ) {}

  async chat(params: ChatParams): Promise<Response> {
    // Hybrid: 로컬 패턴 매칭 시도
    const localResponse = this.matchLocalPattern(params.message, params.stage);

    if (localResponse) {
      await this.saveMessage(params, params.message, "user", true);
      await this.saveMessage(params, localResponse, "assistant", true);

      return new Response(
        JSON.stringify({ role: "assistant", content: localResponse, isLocal: true }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // LLM path: 컨텍스트 조립 + SSE 릴레이
    const systemPrompt = this.buildSystemPrompt(params);
    const history = await this.getRecentHistory(params.conversationId, 10);
    const messages: ChatMessage[] = [
      ...history,
      { role: "user", content: params.message },
    ];

    await this.saveMessage(params, params.message, "user", false);

    const response = await this.openRouter.streamChat(messages, systemPrompt);

    return new Response(response.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  async getHistory(conversationId: string, tenantId: string) {
    const result = await this.db
      .prepare(
        `SELECT id, role, content, is_local_response, created_at
         FROM help_agent_conversations
         WHERE conversation_id = ? AND tenant_id = ?
         ORDER BY created_at ASC
         LIMIT 100`,
      )
      .bind(conversationId, tenantId)
      .all();

    return {
      conversationId,
      messages: (result.results || []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        role: r.role as string,
        content: r.content as string,
        isLocalResponse: r.is_local_response === 1,
        createdAt: r.created_at as string,
      })),
    };
  }

  private matchLocalPattern(message: string, stage?: string): string | null {
    for (const pattern of LOCAL_PATTERNS) {
      if (pattern.regex.test(message)) {
        return pattern.handler(stage);
      }
    }
    return null;
  }

  private buildSystemPrompt(params: ChatParams): string {
    const stageKey = params.stage || "2-0";
    const stageInfo = STAGE_INFO[stageKey];
    const stageName = stageInfo ? stageInfo.name : "알 수 없음";

    return `당신은 Foundry-X Help Agent입니다. AX 사업개발 프로세스를 안내하는 AI 비서예요.

현재 사용자 상태:
- 사업 아이템 ID: ${params.bizItemId || "미선택"}
- 현재 단계: ${stageKey} (${stageName})

AX BD 프로세스 2단계 발굴의 맥락에서 답변하세요.
- 한국어로 답변하세요 (영어 질문에도 한국어로)
- 간결하고 실용적으로 답변하세요
- 프로세스와 관련 없는 질문에는 정중하게 범위 밖임을 안내하세요`;
  }

  private async getRecentHistory(
    conversationId: string,
    limit: number,
  ): Promise<ChatMessage[]> {
    const result = await this.db
      .prepare(
        `SELECT role, content FROM help_agent_conversations
         WHERE conversation_id = ?
         ORDER BY created_at DESC LIMIT ?`,
      )
      .bind(conversationId, limit)
      .all();

    return (result.results || [])
      .reverse()
      .map((r: Record<string, unknown>) => ({
        role: r.role as ChatMessage["role"],
        content: r.content as string,
      }));
  }

  private async saveMessage(
    params: ChatParams,
    content: string,
    role: "user" | "assistant",
    isLocal: boolean,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO help_agent_conversations
         (id, tenant_id, user_id, biz_item_id, discovery_stage, conversation_id, role, content, is_local_response)
         VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        params.tenantId,
        params.userId,
        params.bizItemId || null,
        params.stage || null,
        params.conversationId,
        role,
        content,
        isLocal ? 1 : 0,
      )
      .run();
  }
}
