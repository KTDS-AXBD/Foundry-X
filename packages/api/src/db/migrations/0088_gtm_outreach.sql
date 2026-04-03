-- Sprint 121: GTM Outreach — 고객 선제안 워크플로 (F299)

CREATE TABLE IF NOT EXISTS gtm_customers (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  industry TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_role TEXT,
  company_size TEXT CHECK(company_size IN ('startup', 'smb', 'mid', 'enterprise')),
  notes TEXT,
  tags TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gtm_customers_org ON gtm_customers(org_id);
CREATE INDEX IF NOT EXISTS idx_gtm_customers_industry ON gtm_customers(org_id, industry);

CREATE TABLE IF NOT EXISTS gtm_outreach (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES gtm_customers(id),
  offering_pack_id TEXT REFERENCES offering_packs(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft', 'proposal_ready', 'sent', 'opened', 'responded', 'meeting_set', 'converted', 'declined', 'archived')),
  proposal_content TEXT,
  proposal_generated_at TEXT,
  sent_at TEXT,
  response_note TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gtm_outreach_org ON gtm_outreach(org_id);
CREATE INDEX IF NOT EXISTS idx_gtm_outreach_customer ON gtm_outreach(customer_id);
CREATE INDEX IF NOT EXISTS idx_gtm_outreach_status ON gtm_outreach(org_id, status);
