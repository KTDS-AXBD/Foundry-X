/** Discovery-X에서 전송하는 수집 데이터 페이로드 */
export interface DiscoveryIngestPayload {
  version: "v1";
  source: CollectionSource;
  timestamp: number;
  data: DiscoveryDataItem[];
}

export interface CollectionSource {
  id: string;
  type: "market_trend" | "competitor" | "pain_point" | "technology" | "regulation";
  name: string;
  url?: string;
}

export interface DiscoveryDataItem {
  id: string;
  sourceId: string;
  type: CollectionSource["type"];
  title: string;
  summary: string;
  content?: string;
  tags: string[];
  confidence: number;
  collectedAt: number;
  metadata?: Record<string, unknown>;
}

/** Discovery-X 연동 상태 */
export interface DiscoveryStatus {
  connected: boolean;
  lastSyncAt: number | null;
  pendingItems: number;
  failedItems: number;
  version: string;
}

/** Discovery-X 연동 설정 */
export interface DiscoveryConfig {
  apiKey: string;
  webhookUrl: string;
  rateLimitPerMinute: number;
  retryMaxAttempts: number;
  retryBackoffMs: number;
}
