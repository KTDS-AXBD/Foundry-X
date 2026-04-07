/**
 * Sprint 69: Commit Gate 서비스 (F213)
 * 2-5 핵심 아이템 선정 후 4개 질문 심화 논의 + 최종 판정
 */

export interface CommitGateInput {
  bizItemId: string;
  question1Answer?: string;
  question2Answer?: string;
  question3Answer?: string;
  question4Answer?: string;
  finalDecision: string;
  reason?: string;
}

export interface CommitGate {
  id: string;
  bizItemId: string;
  orgId: string;
  question1Answer: string | null;
  question2Answer: string | null;
  question3Answer: string | null;
  question4Answer: string | null;
  finalDecision: string;
  reason: string | null;
  decidedBy: string;
  decidedAt: string;
  createdAt: string;
}

interface CommitGateRow {
  id: string;
  biz_item_id: string;
  org_id: string;
  question_1_answer: string | null;
  question_2_answer: string | null;
  question_3_answer: string | null;
  question_4_answer: string | null;
  final_decision: string;
  reason: string | null;
  decided_by: string;
  decided_at: string;
  created_at: string;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toCommitGate(row: CommitGateRow): CommitGate {
  return {
    id: row.id,
    bizItemId: row.biz_item_id,
    orgId: row.org_id,
    question1Answer: row.question_1_answer,
    question2Answer: row.question_2_answer,
    question3Answer: row.question_3_answer,
    question4Answer: row.question_4_answer,
    finalDecision: row.final_decision,
    reason: row.reason,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
  };
}

export class CommitGateService {
  constructor(private db: D1Database) {}

  async create(orgId: string, userId: string, input: CommitGateInput): Promise<CommitGate> {
    const id = generateId();
    const now = new Date().toISOString();

    // UPSERT: one commit gate per biz_item
    await this.db
      .prepare(
        `INSERT INTO ax_commit_gates (id, biz_item_id, org_id, question_1_answer, question_2_answer, question_3_answer, question_4_answer, final_decision, reason, decided_by, decided_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(biz_item_id) DO UPDATE SET
           question_1_answer = excluded.question_1_answer,
           question_2_answer = excluded.question_2_answer,
           question_3_answer = excluded.question_3_answer,
           question_4_answer = excluded.question_4_answer,
           final_decision = excluded.final_decision,
           reason = excluded.reason,
           decided_by = excluded.decided_by,
           decided_at = excluded.decided_at`,
      )
      .bind(
        id,
        input.bizItemId,
        orgId,
        input.question1Answer ?? null,
        input.question2Answer ?? null,
        input.question3Answer ?? null,
        input.question4Answer ?? null,
        input.finalDecision,
        input.reason ?? null,
        userId,
        now,
        now,
      )
      .run();

    const row = await this.db
      .prepare("SELECT * FROM ax_commit_gates WHERE biz_item_id = ?")
      .bind(input.bizItemId)
      .first<CommitGateRow>();

    return toCommitGate(row!);
  }

  async getByItem(bizItemId: string): Promise<CommitGate | null> {
    const row = await this.db
      .prepare("SELECT * FROM ax_commit_gates WHERE biz_item_id = ?")
      .bind(bizItemId)
      .first<CommitGateRow>();

    return row ? toCommitGate(row) : null;
  }
}
