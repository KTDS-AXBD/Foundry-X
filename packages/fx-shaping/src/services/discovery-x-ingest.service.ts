import type { DiscoveryIngestPayload, DiscoveryStatus } from "@foundry-x/shared";

export class DiscoveryXIngestService {
  constructor(private db: D1Database) {}

  async ingest(payload: DiscoveryIngestPayload, _tenantId: string): Promise<{ received: number }> {
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

  async triggerSync(_tenantId: string): Promise<void> {
    // TODO: F562 shared-contracts 이후 Discovery-X API 호출 구현
  }
}
