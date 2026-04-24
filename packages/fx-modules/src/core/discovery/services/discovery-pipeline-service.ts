export class DiscoveryPipelineService {
  constructor(_db: D1Database) {}

  async create(_input: unknown): Promise<unknown> { return null; }
  async list(_tenantId: string, _filter?: unknown): Promise<unknown[]> { return []; }
  async get(_id: string): Promise<unknown> { return null; }
  async advance(_id: string, _userId: string): Promise<void> {}
  async handleStepComplete(_id: string, _input: unknown): Promise<void> {}
  async handleStepFailed(_id: string, _input: unknown): Promise<void> {}
  async handleCheckpoint(_id: string, _decision: unknown): Promise<void> {}
  async abort(_id: string, _reason?: string): Promise<void> {}
}
