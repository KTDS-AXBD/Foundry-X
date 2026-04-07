import type { DiscoveryIngestPayload, DiscoveryStatus } from "@foundry-x/shared";

export class DiscoveryXIngestService {
  constructor(private db: D1Database) {}

  async ingest(payload: DiscoveryIngestPayload, _tenantId: string): Promise<{ received: number }> {
    // TODO: Phase 5e에서 실제 저장 구현
    return { received: payload.data.length };
  }

  async getStatus(_tenantId: string): Promise<DiscoveryStatus> {
    return {
      connected: false,
      lastSyncAt: null,
      pendingItems: 0,
      failedItems: 0,
      version: "v1",
    };
  }

  async triggerSync(_tenantId: string, _options?: { since?: number; types?: string[] }): Promise<void> {
    // TODO: Discovery-X API 호출하여 데이터 pulling
  }
}
