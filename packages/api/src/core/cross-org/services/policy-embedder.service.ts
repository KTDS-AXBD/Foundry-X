// F620 CO-I01: PolicyEmbedder — 정책 텍스트 임베딩 + KVCache + D1 영속
// Minimal: 진정 vector embedding은 후속 sprint(CO-I02 LLM 보조 동치 판정)에서 정밀화
// 본 sprint는 stub 패턴 (sha256 → vector_json) + KVCache + D1 cache 다층 구조
import type { LLMService, KVCacheService } from "../../infra/types.js";

const STUB_MODEL = "stub-sha256-v1";
const STUB_VECTOR_DIM = 8; // Minimal embedding 차원 (real 384/768 미사용)
const KV_PREFIX = "f620:embed:";
const KV_TTL_SECONDS = 86400; // 24h

export interface PolicyEmbedding {
  textHash: string;
  orgId: string;
  vector: number[];
  model: string;
  sourceKind?: string;
  cachedAt: number;
}

export interface SimilarPolicy {
  textHash: string;
  vector: number[];
  similarity: number; // 0.0~1.0
  cachedAt: number;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Stub embedding: sha256 → 8 normalized floats (deterministic, replaceable by real LLM later)
function hashToStubVector(hashHex: string): number[] {
  const v: number[] = [];
  for (let i = 0; i < STUB_VECTOR_DIM; i++) {
    const byte = parseInt(hashHex.slice(i * 4, i * 4 + 2), 16);
    v.push(byte / 255);
  }
  return v;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export class PolicyEmbedder {
  constructor(
    private readonly db: D1Database,
    private readonly cache: KVCacheService,
    // LLMService는 후속 CO-I02에서 활용 — Minimal stub은 LLM 미호출
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private readonly _llm?: LLMService,
  ) {}

  async embedPolicy(
    text: string,
    orgId: string,
    sourceKind?: string,
  ): Promise<PolicyEmbedding> {
    const textHash = await sha256Hex(text.trim().toLowerCase());
    const kvKey = `${KV_PREFIX}${textHash}`;

    // 1. KV cache hit → 즉시 반환
    const cached = await this.cache.get<PolicyEmbedding>(kvKey);
    if (cached) return cached;

    // 2. D1 cache hit → KV 백필 후 반환
    const row = await this.db
      .prepare("SELECT * FROM policy_embeddings_cache WHERE policy_text_hash = ?")
      .bind(textHash)
      .first<{
        policy_text_hash: string;
        org_id: string;
        vector_json: string;
        model: string;
        source_kind: string | null;
        cached_at: number;
      }>();
    if (row) {
      const fromD1: PolicyEmbedding = {
        textHash: row.policy_text_hash,
        orgId: row.org_id,
        vector: JSON.parse(row.vector_json) as number[],
        model: row.model,
        sourceKind: row.source_kind ?? undefined,
        cachedAt: row.cached_at,
      };
      await this.cache.set(kvKey, fromD1, KV_TTL_SECONDS);
      return fromD1;
    }

    // 3. Compute stub embedding (CO-I02에서 LLM으로 대체)
    const vector = hashToStubVector(textHash);
    const fresh: PolicyEmbedding = {
      textHash,
      orgId,
      vector,
      model: STUB_MODEL,
      sourceKind,
      cachedAt: Date.now(),
    };

    // 4. D1 + KV 영속
    await this.db
      .prepare(
        `INSERT OR REPLACE INTO policy_embeddings_cache
         (policy_text_hash, org_id, vector_json, model, source_kind, cached_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(textHash, orgId, JSON.stringify(vector), STUB_MODEL, sourceKind ?? null, fresh.cachedAt)
      .run();
    await this.cache.set(kvKey, fresh, KV_TTL_SECONDS);

    return fresh;
  }

  async findSimilar(
    text: string,
    orgId: string,
    threshold = 0.9,
    limit = 5,
  ): Promise<SimilarPolicy[]> {
    const target = await this.embedPolicy(text, orgId);

    // D1에서 같은 org의 다른 embedding 가져와 cosine similarity 계산
    const rows = await this.db
      .prepare(
        `SELECT policy_text_hash, vector_json, cached_at FROM policy_embeddings_cache
         WHERE org_id = ? AND policy_text_hash != ?`,
      )
      .bind(orgId, target.textHash)
      .all<{ policy_text_hash: string; vector_json: string; cached_at: number }>();

    const results: SimilarPolicy[] = [];
    for (const row of rows.results ?? []) {
      const vec = JSON.parse(row.vector_json) as number[];
      const sim = cosineSimilarity(target.vector, vec);
      if (sim >= threshold) {
        results.push({
          textHash: row.policy_text_hash,
          vector: vec,
          similarity: sim,
          cachedAt: row.cached_at,
        });
      }
    }
    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }
}
