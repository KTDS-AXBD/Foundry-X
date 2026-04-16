// F552: Dual AI Review service — stub (TDD Red phase)
import type { DualReviewInsert, DualReview, DualReviewStats } from "../types.js";

export class DualReviewService {
  constructor(private db: D1Database) {}

  async insert(_data: DualReviewInsert): Promise<{ id: number }> {
    throw new Error("Not implemented");
  }

  async list(_limit?: number): Promise<DualReview[]> {
    throw new Error("Not implemented");
  }

  async stats(): Promise<DualReviewStats> {
    throw new Error("Not implemented");
  }
}
