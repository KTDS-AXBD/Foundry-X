import type { D1Database } from "@cloudflare/workers-types";

export interface ApiKey {
  id: string;
  orgId: string;
  name: string;
  keyPrefix: string;
  role: "admin" | "member" | "viewer";
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdBy: string;
  createdAt: string;
  revokedAt: string | null;
}

interface ApiKeyRow {
  id: string;
  org_id: string;
  name: string;
  key_prefix: string;
  role: string;
  scopes: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  revoked_at: string | null;
}

async function hashKey(rawKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateRawKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return (
    "gx_" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function rowToApiKey(row: ApiKeyRow): ApiKey {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    keyPrefix: row.key_prefix,
    role: row.role as ApiKey["role"],
    scopes: JSON.parse(row.scopes) as string[],
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  };
}

export class ApiKeyService {
  constructor(private db: D1Database) {}

  async create(
    orgId: string,
    name: string,
    role: string,
    createdBy: string,
  ): Promise<{ key: string; record: ApiKey }> {
    const rawKey = generateRawKey();
    const keyHash = await hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 8); // "gx_" + 5 hex chars
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO api_keys (id, org_id, name, key_hash, key_prefix, role, scopes, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, orgId, name, keyHash, keyPrefix, role, "[]", createdBy, now)
      .run();

    const record: ApiKey = {
      id,
      orgId,
      name,
      keyPrefix,
      role: role as ApiKey["role"],
      scopes: [],
      lastUsedAt: null,
      expiresAt: null,
      createdBy,
      createdAt: now,
      revokedAt: null,
    };

    return { key: rawKey, record };
  }

  async verify(rawKey: string): Promise<ApiKey | null> {
    const keyHash = await hashKey(rawKey);
    const row = await this.db
      .prepare(
        `SELECT * FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL`,
      )
      .bind(keyHash)
      .first<ApiKeyRow>();

    if (!row) return null;

    // 만료 확인
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return null;
    }

    // last_used_at 갱신 (fire-and-forget)
    void this.db
      .prepare(`UPDATE api_keys SET last_used_at = ? WHERE id = ?`)
      .bind(new Date().toISOString(), row.id)
      .run();

    return rowToApiKey(row);
  }

  async list(orgId: string): Promise<ApiKey[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM api_keys WHERE org_id = ? AND revoked_at IS NULL ORDER BY created_at DESC`,
      )
      .bind(orgId)
      .all<ApiKeyRow>();

    return (result.results ?? []).map(rowToApiKey);
  }

  async revoke(id: string, orgId: string): Promise<void> {
    await this.db
      .prepare(
        `UPDATE api_keys SET revoked_at = ? WHERE id = ? AND org_id = ?`,
      )
      .bind(new Date().toISOString(), id, orgId)
      .run();
  }

  async recordUsage(
    keyId: string,
    endpoint: string,
    statusCode: number,
  ): Promise<void> {
    const usageId = crypto.randomUUID();
    await this.db
      .prepare(
        `INSERT INTO api_key_usage (id, key_id, endpoint, status_code, ts) VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(usageId, keyId, endpoint, statusCode, new Date().toISOString())
      .run();
  }
}
