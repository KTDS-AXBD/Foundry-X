-- F620 Sprint 367 — Cross-Org Integration (T5 마지막)
-- CO-I01 PolicyEmbedder cache + CO-I04 ExpertReviewManager 큐
-- 의존: F603 (cross_org_groups, cross_org_export_blocks), F606 (audit_events)

-- CO-I01: 정책 임베딩 캐시 (LLM 호출 비용 회피)
CREATE TABLE policy_embeddings_cache (
  policy_text_hash TEXT PRIMARY KEY,           -- sha256 hex of normalized policy text
  org_id TEXT NOT NULL,
  vector_json TEXT NOT NULL,                    -- JSON.stringify(number[]) 또는 stub representation
  model TEXT NOT NULL,                          -- llm model name (llama-3.1 / claude-haiku / stub-sha256 등)
  source_kind TEXT,                             -- policy/ontology/skill/system_knowledge (선택)
  cached_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE INDEX idx_policy_embeddings_cache_org ON policy_embeddings_cache(org_id);
CREATE INDEX idx_policy_embeddings_cache_cached_at ON policy_embeddings_cache(cached_at);

-- CO-I04: Expert HITL 리뷰 큐
-- review_id: assignmentId 분류 결정에 대한 SME signOff lifecycle
CREATE TABLE cross_org_review_queue (
  review_id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,                  -- cross_org_groups.id 참조
  org_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',       -- pending / in_review / signed_off
  decision TEXT,                                -- NULL or approve / reject / reclassify
  reclassified_to TEXT,                         -- decision='reclassify' 시 대상 그룹
  expert_id TEXT,                               -- signOff한 expert
  notes TEXT,                                   -- expert 코멘트
  enqueued_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
  signed_off_at INTEGER,
  CHECK (status IN ('pending', 'in_review', 'signed_off')),
  CHECK (decision IS NULL OR decision IN ('approve', 'reject', 'reclassify'))
);

CREATE INDEX idx_cross_org_review_queue_status ON cross_org_review_queue(status, org_id);
CREATE INDEX idx_cross_org_review_queue_assignment ON cross_org_review_queue(assignment_id);

-- review_queue append-only 보장 (한 번 signed_off 되면 변경 차단)
CREATE TRIGGER cross_org_review_queue_no_resign
BEFORE UPDATE ON cross_org_review_queue
WHEN OLD.status = 'signed_off' AND NEW.status != OLD.status
BEGIN
  SELECT RAISE(ABORT, 'cross_org_review_queue: signed_off entries are immutable');
END;
