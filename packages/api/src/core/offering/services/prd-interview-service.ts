/**
 * Sprint 220 F455: PRD 인터뷰 세션 관리 서비스
 * 1차 PRD 기반 질문 생성 + 응답 반영 + 2차 PRD 생성
 */

import type { AgentRunner } from "../../../core/agent/services/agent-runner.js";

export interface InterviewQuestion {
  seq: number;
  question: string;
  questionContext: string;
  answer: string | null;
  answeredAt: string | null;
}

export interface InterviewSession {
  id: string;
  bizItemId: string;
  prdId: string;
  status: "in_progress" | "completed" | "cancelled";
  questionCount: number;
  answeredCount: number;
  questions: InterviewQuestion[];
}

export interface AnswerResult {
  interviewId: string;
  seq: number;
  answeredCount: number;
  remainingCount: number;
  isComplete: boolean;
  updatedPrd?: {
    id: string;
    version: number;
    content: string;
  };
}

interface InterviewRow {
  id: string;
  biz_item_id: string;
  prd_id: string;
  status: string;
  question_count: number;
  answered_count: number;
  started_at: number;
  completed_at: number | null;
}

interface QaRow {
  id: string;
  interview_id: string;
  seq: number;
  question: string;
  question_context: string | null;
  answer: string | null;
  answered_at: number | null;
}

// 도메인 템플릿 질문 (PRD 섹션 취약점 기반)
const DOMAIN_QUESTIONS: Array<{ question: string; context: string; keywords: string[] }> = [
  { question: "이 사업을 통해 해결하려는 고객의 핵심 불편함은 무엇인가요? 구체적인 사례를 들어주세요.", context: "프로젝트 개요", keywords: ["목적", "개요", "배경", "미정", "tbd"] },
  { question: "주요 타깃 고객을 구체적으로 설명해주세요. 나이, 직종, 사용 맥락 등 페르소나 정보가 있다면 공유해주세요.", context: "타깃 고객", keywords: ["타깃", "고객", "사용자", "미정", "tbd"] },
  { question: "이 시장의 전체 규모(TAM)와 현재 경쟁사들의 현황은 어떻게 되나요?", context: "시장 분석", keywords: ["시장", "규모", "경쟁", "미정", "tbd"] },
  { question: "핵심 기술 스택과 구현 난이도, 예상 개발 기간을 알려주세요.", context: "기술 요건", keywords: ["기술", "아키텍처", "개발", "미정", "tbd"] },
  { question: "MVP에 반드시 포함되어야 할 기능 Top 3는 무엇인가요?", context: "기능 범위", keywords: ["기능", "mvp", "범위", "미정", "tbd"] },
  { question: "프로젝트 주요 마일스톤과 목표 출시 시점은 언제인가요?", context: "일정", keywords: ["일정", "마일스톤", "출시", "미정", "tbd"] },
  { question: "가장 큰 리스크 요인 2~3가지와 대응 방안을 알려주세요.", context: "리스크", keywords: ["리스크", "위험", "제약", "미정", "tbd"] },
  { question: "이 사업의 수익 모델과 단위 경제성(Unit Economics)은 어떻게 되나요?", context: "수익 모델", keywords: ["수익", "모델", "과금", "미정", "tbd"] },
];

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * 1차 PRD에서 취약 섹션 감지 → 관련 질문 선택 (5~8개)
 */
function selectQuestions(prdContent: string): Array<{ question: string; context: string }> {
  const lowerContent = prdContent.toLowerCase();
  const scored = DOMAIN_QUESTIONS.map((q) => {
    // 키워드가 PRD에서 빈약하게 나타날수록 우선순위 높음
    const hasWeakContent = q.keywords.some((kw) => lowerContent.includes(kw));
    return { ...q, priority: hasWeakContent ? 1 : 0 };
  });

  // 우선순위 높은 것 먼저, 최대 8개
  const selected = [
    ...scored.filter((q) => q.priority === 1),
    ...scored.filter((q) => q.priority === 0),
  ].slice(0, 8);

  // 최소 5개 보장
  return selected.length >= 5 ? selected : scored.slice(0, 5);
}

async function generateQuestionsWithLlm(
  prdContent: string,
  runner: AgentRunner,
): Promise<Array<{ question: string; context: string }>> {
  try {
    const result = await runner.execute({
      taskId: `prd-interview-questions-${Date.now()}`,
      agentId: "prd-interviewer",
      taskType: "policy-evaluation",
      context: {
        repoUrl: "",
        branch: "",
        instructions: `당신은 KT DS AX BD팀 사업개발 전문가입니다.
아래 1차 PRD를 검토하고, 사업 실행에 필요하지만 누락되거나 빈약한 정보를 파악하세요.
각 빈약 영역에 대해 구체적인 질문을 5~8개 생성하세요.

질문 형식 (JSON 배열):
[
  { "question": "...", "context": "관련 PRD 섹션명" },
  ...
]

규칙:
- 사용자가 쉽게 답변할 수 있는 구체적 질문
- 예/아니오 질문 지양, 서술형 유도
- 반드시 JSON만 출력

--- 1차 PRD ---
${prdContent.slice(0, 3000)}`,
        systemPromptOverride: "당신은 사업개발 인터뷰 전문가입니다. JSON 형식으로만 응답하세요.",
      },
      constraints: [],
    });

    if (result.status === "success" && result.output?.analysis) {
      const text = result.output.analysis;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Array<{ question: string; context: string }>;
        if (Array.isArray(parsed) && parsed.length >= 5) {
          return parsed.slice(0, 8);
        }
      }
    }
  } catch {
    // LLM 실패 시 도메인 템플릿으로 폴백
  }
  return selectQuestions(prdContent);
}

async function buildSecondPrd(
  firstPrdContent: string,
  qas: InterviewQuestion[],
  runner: AgentRunner,
): Promise<string> {
  const qaText = qas
    .filter((q) => q.answer)
    .map((q) => `Q${q.seq}. [${q.questionContext}] ${q.question}\nA: ${q.answer}`)
    .join("\n\n");

  try {
    const result = await runner.execute({
      taskId: `prd-2nd-generation-${Date.now()}`,
      agentId: "prd-refiner",
      taskType: "policy-evaluation",
      context: {
        repoUrl: "",
        branch: "",
        instructions: `당신은 사업개발 PRD 전문 편집자입니다.
1차 PRD와 사용자 인터뷰 응답을 기반으로 PRD를 보강하세요.

규칙:
- 기존 1차 PRD 내용을 삭제하지 않음
- 인터뷰 응답을 적절한 섹션에 반영
- 새로운 인사이트를 관련 섹션에 추가
- 보강된 부분에 [보강] 마커 추가

--- 1차 PRD ---
${firstPrdContent}

--- 인터뷰 Q&A ---
${qaText}`,
        systemPromptOverride: "당신은 사업개발 PRD 전문 편집자입니다.",
      },
      constraints: [],
    });

    if (result.status === "success" && result.output?.analysis) {
      return result.output.analysis;
    }
  } catch {
    // 폴백: 1차 PRD + Q&A 단순 병합
  }

  // 폴백: 텍스트 병합
  return `${firstPrdContent}\n\n---\n\n## 인터뷰 보강 내용\n\n${qaText}`;
}

export class PrdInterviewService {
  constructor(
    private db: D1Database,
    private runner: AgentRunner,
  ) {}

  async startInterview(bizItemId: string, prdId: string): Promise<InterviewSession> {
    // PRD 존재 확인
    const prdRow = await this.db
      .prepare("SELECT id, content FROM biz_generated_prds WHERE id = ? AND biz_item_id = ?")
      .bind(prdId, bizItemId)
      .first<{ id: string; content: string }>();
    if (!prdRow) throw new Error("PRD_NOT_FOUND");

    // 진행 중 인터뷰 중복 방지
    const existing = await this.db
      .prepare("SELECT id FROM prd_interviews WHERE biz_item_id = ? AND status = 'in_progress'")
      .bind(bizItemId)
      .first<{ id: string }>();
    if (existing) throw new Error("INTERVIEW_ALREADY_IN_PROGRESS");

    // 질문 생성
    const selectedQs = await generateQuestionsWithLlm(prdRow.content, this.runner);

    const interviewId = generateId();
    await this.db
      .prepare(
        `INSERT INTO prd_interviews (id, biz_item_id, prd_id, status, question_count, answered_count)
         VALUES (?, ?, ?, 'in_progress', ?, 0)`,
      )
      .bind(interviewId, bizItemId, prdId, selectedQs.length)
      .run();

    // 질문 저장
    for (let i = 0; i < selectedQs.length; i++) {
      const q = selectedQs[i];
      if (!q) continue;
      await this.db
        .prepare(
          `INSERT INTO prd_interview_qas (id, interview_id, seq, question, question_context)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(generateId(), interviewId, i + 1, q.question, q.context)
        .run();
    }

    return {
      id: interviewId,
      bizItemId,
      prdId,
      status: "in_progress",
      questionCount: selectedQs.length,
      answeredCount: 0,
      questions: selectedQs.map((q, i) => ({
        seq: i + 1,
        question: q.question,
        questionContext: q.context,
        answer: null,
        answeredAt: null,
      })),
    };
  }

  async submitAnswer(interviewId: string, seq: number, answer: string): Promise<AnswerResult> {
    const now = Math.floor(Date.now() / 1000);

    // 질문 존재 확인
    const qa = await this.db
      .prepare("SELECT * FROM prd_interview_qas WHERE interview_id = ? AND seq = ?")
      .bind(interviewId, seq)
      .first<QaRow>();
    if (!qa) throw new Error("QA_NOT_FOUND");

    // 응답 저장
    await this.db
      .prepare("UPDATE prd_interview_qas SET answer = ?, answered_at = ? WHERE interview_id = ? AND seq = ?")
      .bind(answer, now, interviewId, seq)
      .run();

    // answered_count 갱신
    await this.db
      .prepare(
        `UPDATE prd_interviews
         SET answered_count = (
           SELECT COUNT(*) FROM prd_interview_qas WHERE interview_id = ? AND answer IS NOT NULL
         )
         WHERE id = ?`,
      )
      .bind(interviewId, interviewId)
      .run();

    // 인터뷰 세션 조회
    const session = await this.db
      .prepare("SELECT * FROM prd_interviews WHERE id = ?")
      .bind(interviewId)
      .first<InterviewRow>();
    if (!session) throw new Error("INTERVIEW_NOT_FOUND");

    const isComplete = session.answered_count >= session.question_count;
    const result: AnswerResult = {
      interviewId,
      seq,
      answeredCount: session.answered_count,
      remainingCount: session.question_count - session.answered_count,
      isComplete,
    };

    if (isComplete) {
      // 2차 PRD 생성
      const prdRow = await this.db
        .prepare("SELECT content FROM biz_generated_prds WHERE id = ?")
        .bind(session.prd_id)
        .first<{ content: string }>();

      const { results: qas } = await this.db
        .prepare("SELECT * FROM prd_interview_qas WHERE interview_id = ? ORDER BY seq")
        .bind(interviewId)
        .all<QaRow>();

      const questions: InterviewQuestion[] = qas.map((q) => ({
        seq: q.seq,
        question: q.question,
        questionContext: q.question_context ?? "",
        answer: q.answer,
        answeredAt: q.answered_at ? new Date(q.answered_at * 1000).toISOString() : null,
      }));

      const secondContent = await buildSecondPrd(prdRow?.content ?? "", questions, this.runner);

      // version 계산
      const latestRow = await this.db
        .prepare("SELECT MAX(version) as max_ver FROM biz_generated_prds WHERE biz_item_id = ?")
        .bind(session.biz_item_id)
        .first<{ max_ver: number | null }>();
      const nextVersion = (latestRow?.max_ver ?? 0) + 1;

      const newPrdId = generateId();
      const nowIso = new Date().toISOString();
      await this.db
        .prepare(
          `INSERT INTO biz_generated_prds
             (id, biz_item_id, version, content, criteria_snapshot, generated_at, source_type, bp_draft_id)
           VALUES (?, ?, ?, ?, '[]', ?, 'interview', NULL)`,
        )
        .bind(newPrdId, session.biz_item_id, nextVersion, secondContent, nowIso)
        .run();

      // 인터뷰 완료 처리
      await this.db
        .prepare("UPDATE prd_interviews SET status = 'completed', completed_at = ? WHERE id = ?")
        .bind(now, interviewId)
        .run();

      result.updatedPrd = { id: newPrdId, version: nextVersion, content: secondContent };
    }

    return result;
  }

  async getStatus(bizItemId: string): Promise<InterviewSession | null> {
    const session = await this.db
      .prepare("SELECT * FROM prd_interviews WHERE biz_item_id = ? ORDER BY started_at DESC LIMIT 1")
      .bind(bizItemId)
      .first<InterviewRow>();
    if (!session) return null;

    const { results: qas } = await this.db
      .prepare("SELECT * FROM prd_interview_qas WHERE interview_id = ? ORDER BY seq")
      .bind(session.id)
      .all<QaRow>();

    return {
      id: session.id,
      bizItemId: session.biz_item_id,
      prdId: session.prd_id,
      status: session.status as InterviewSession["status"],
      questionCount: session.question_count,
      answeredCount: session.answered_count,
      questions: qas.map((q) => ({
        seq: q.seq,
        question: q.question,
        questionContext: q.question_context ?? "",
        answer: q.answer,
        answeredAt: q.answered_at ? new Date(q.answered_at * 1000).toISOString() : null,
      })),
    };
  }
}
