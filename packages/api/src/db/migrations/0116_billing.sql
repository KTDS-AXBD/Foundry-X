-- Migration 0116: Billing — subscription plans + tenant subscriptions + usage records

CREATE TABLE IF NOT EXISTS subscription_plans (
  id           TEXT    PRIMARY KEY,
  name         TEXT    NOT NULL,
  monthly_limit INTEGER NOT NULL, -- -1 = unlimited
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO subscription_plans (id, name, monthly_limit) VALUES
  ('free',       'Free',       1000),
  ('pro',        'Pro',        50000),
  ('enterprise', 'Enterprise', -1);

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  org_id     TEXT NOT NULL PRIMARY KEY,
  plan_id    TEXT NOT NULL DEFAULT 'free',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

CREATE TABLE IF NOT EXISTS usage_records (
  org_id     TEXT    NOT NULL,
  month      TEXT    NOT NULL,
  api_calls  INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, month)
);

CREATE INDEX IF NOT EXISTS idx_usage_records_org
  ON usage_records (org_id, month);
