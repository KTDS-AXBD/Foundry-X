// stub — F632 TDD Red Phase
export class ReviewCycle {
  constructor(_db: D1Database, _llm: unknown, _bus: unknown) {}
  async startCycle(_input: unknown): Promise<never> {
    throw new Error("not implemented");
  }
  async submitHumanReview(_cycleId: string, _reviewerId: string, _content: string): Promise<void> {
    throw new Error("not implemented");
  }
}
