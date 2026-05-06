export class SystemKnowledgeService {
  constructor(private db: D1Database) {}
  async registerKnowledge(_input: unknown): Promise<never> { throw new Error("not implemented"); }
  async getKnowledge(_id: string): Promise<null> { return null; }
}
