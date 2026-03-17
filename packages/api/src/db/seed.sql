-- Seed: admin user + default project
-- Run after migration: wrangler d1 execute foundry-x-db --local --file=src/db/seed.sql

INSERT OR IGNORE INTO users (id, email, name, role, password_hash, created_at, updated_at)
VALUES (
  'usr_admin_001',
  'ktds.axbd@gmail.com',
  'Sinclair Seo',
  'admin',
  NULL,
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO projects (id, name, repo_url, owner_id, created_at)
VALUES (
  'proj_foundry_x',
  'Foundry-X',
  'https://github.com/KTDS-AXBD/Foundry-X.git',
  'usr_admin_001',
  datetime('now')
);
