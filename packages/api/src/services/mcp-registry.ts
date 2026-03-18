/**
 * MCP Server Registry — D1 기반 MCP 서버 등록/조회/상태 관리
 * Sprint 12 F59/F60
 */

export interface McpServerRecord {
  id: string;
  name: string;
  serverUrl: string;
  transportType: "sse" | "http";
  apiKeyEncrypted: string | null;
  status: "active" | "inactive" | "error";
  lastConnectedAt: string | null;
  errorMessage: string | null;
  toolsCache: string | null;
  toolsCachedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface McpServerRow {
  id: string;
  name: string;
  server_url: string;
  transport_type: "sse" | "http";
  api_key_encrypted: string | null;
  status: "active" | "inactive" | "error";
  last_connected_at: string | null;
  error_message: string | null;
  tools_cache: string | null;
  tools_cached_at: string | null;
  created_at: string;
  updated_at: string;
}

function rowToRecord(row: McpServerRow): McpServerRecord {
  return {
    id: row.id,
    name: row.name,
    serverUrl: row.server_url,
    transportType: row.transport_type,
    apiKeyEncrypted: row.api_key_encrypted,
    status: row.status,
    lastConnectedAt: row.last_connected_at,
    errorMessage: row.error_message,
    toolsCache: row.tools_cache,
    toolsCachedAt: row.tools_cached_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class McpServerRegistry {
  constructor(private db: D1Database) {}

  async listServers(): Promise<McpServerRecord[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM mcp_servers ORDER BY created_at DESC")
      .all<McpServerRow>();
    return results.map(rowToRecord);
  }

  async getServer(id: string): Promise<McpServerRecord | null> {
    const row = await this.db
      .prepare("SELECT * FROM mcp_servers WHERE id = ?")
      .bind(id)
      .first<McpServerRow>();
    return row ? rowToRecord(row) : null;
  }

  async createServer(params: {
    name: string;
    serverUrl: string;
    transportType?: "sse" | "http";
    apiKey?: string;
  }): Promise<McpServerRecord> {
    const id = crypto.randomUUID().replace(/-/g, "");
    const now = new Date().toISOString();
    const encrypted = params.apiKey ? this.encryptApiKey(params.apiKey) : null;
    const transportType = params.transportType ?? "sse";

    await this.db
      .prepare(
        `INSERT INTO mcp_servers (id, name, server_url, transport_type, api_key_encrypted, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, params.name, params.serverUrl, transportType, encrypted, now, now)
      .run();

    return (await this.getServer(id))!;
  }

  async deleteServer(id: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM mcp_servers WHERE id = ?")
      .bind(id)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }

  async updateStatus(
    id: string,
    status: "active" | "inactive" | "error",
    errorMessage?: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `UPDATE mcp_servers
         SET status = ?, error_message = ?, last_connected_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(status, errorMessage ?? null, now, now, id)
      .run();
  }

  async cacheTools(id: string, tools: unknown[]): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `UPDATE mcp_servers SET tools_cache = ?, tools_cached_at = ?, updated_at = ? WHERE id = ?`,
      )
      .bind(JSON.stringify(tools), now, now, id)
      .run();
  }

  async findServerForTool(toolName: string): Promise<McpServerRecord | null> {
    const { results } = await this.db
      .prepare("SELECT * FROM mcp_servers WHERE status = 'active' AND tools_cache IS NOT NULL")
      .all<McpServerRow>();

    for (const row of results) {
      if (!row.tools_cache) continue;
      try {
        const tools = JSON.parse(row.tools_cache) as { name: string }[];
        if (tools.some((t) => t.name === toolName)) {
          return rowToRecord(row);
        }
      } catch {
        // invalid JSON — skip
      }
    }
    return null;
  }

  static readonly PRESET_CONFIGS = {
    "ai-foundry": {
      baseUrl: "https://svc-mcp-server-production.sinclair-account.workers.dev",
      transportType: "http" as const,
      defaultName: (skillId: string) => `AI Foundry - ${skillId.slice(0, 8)}`,
    },
  } as const;

  async createServerPreset(
    preset: keyof typeof McpServerRegistry.PRESET_CONFIGS,
    config: { skillId: string; apiKey: string; name?: string; skipHealthCheck?: boolean },
  ): Promise<McpServerRecord> {
    const presetDef = McpServerRegistry.PRESET_CONFIGS[preset];
    if (!presetDef) throw new Error(`Unknown preset: ${String(preset)}`);
    const serverUrl = `${presetDef.baseUrl}/mcp/${config.skillId}`;
    const name = config.name ?? presetDef.defaultName(config.skillId);
    const record = await this.createServer({ name, serverUrl, transportType: presetDef.transportType, apiKey: config.apiKey });
    if (!config.skipHealthCheck) {
      try { await this.updateStatus(record.id, "active"); }
      catch (err) { await this.updateStatus(record.id, "error", err instanceof Error ? err.message : String(err)); }
    }
    return (await this.getServer(record.id))!;
  }

  encryptApiKey(key: string): string {
    return btoa(key);
  }

  decryptApiKey(encrypted: string): string {
    return atob(encrypted);
  }
}
