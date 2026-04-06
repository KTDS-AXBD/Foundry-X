// F356: Prototype Feedback shared types (Sprint 160)

export type FeedbackCategory = "layout" | "content" | "functionality" | "ux" | "other";
export type FeedbackStatus = "pending" | "applied" | "dismissed";

export interface PrototypeFeedback {
  id: string;
  jobId: string;
  orgId: string;
  authorId: string | null;
  category: FeedbackCategory;
  content: string;
  status: FeedbackStatus;
  createdAt: number;
}
