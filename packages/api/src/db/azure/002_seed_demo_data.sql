-- 002_seed_demo_data.sql
-- Azure SQL (T-SQL) demo seed data for Foundry-X PoC.
-- Idempotent: uses IF NOT EXISTS pattern instead of SQLite's INSERT OR IGNORE.

-- =============================================================================
-- 1. Demo user
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM users WHERE id = 'demo-user-001')
  INSERT INTO users (id, email, name, role, password_hash, created_at, updated_at)
  VALUES (
    'demo-user-001',
    'demo@foundry-x.dev',
    'Demo User',
    'admin',
    NULL,
    GETUTCDATE(),
    GETUTCDATE()
  );

-- =============================================================================
-- 2. Demo organization
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = 'demo-org-001')
  INSERT INTO organizations (id, name, slug, plan, settings, created_at, updated_at)
  VALUES (
    'demo-org-001',
    'Demo Organization',
    'demo-org',
    'pro',
    '{}',
    GETUTCDATE(),
    GETUTCDATE()
  );

-- =============================================================================
-- 3. Org membership
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM org_members WHERE org_id = 'demo-org-001' AND user_id = 'demo-user-001')
  INSERT INTO org_members (org_id, user_id, role, joined_at)
  VALUES (
    'demo-org-001',
    'demo-user-001',
    'owner',
    GETUTCDATE()
  );

-- =============================================================================
-- 4. Demo project
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM projects WHERE id = 'demo-project-001')
  INSERT INTO projects (id, name, repo_url, owner_id, org_id, created_at)
  VALUES (
    'demo-project-001',
    'Foundry-X Demo',
    'https://github.com/KTDS-AXBD/Foundry-X.git',
    'demo-user-001',
    'demo-org-001',
    GETUTCDATE()
  );

-- =============================================================================
-- 5. Demo SR requests (3 types for scenario demo)
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM sr_requests WHERE id = 'demo-sr-001')
  INSERT INTO sr_requests (id, org_id, title, description, sr_type, priority, status, confidence, requester_id, created_at, updated_at)
  VALUES (
    'demo-sr-001',
    'demo-org-001',
    'Login page 500 error on Chrome',
    'Users report intermittent 500 errors when accessing the login page on Chrome 120+.',
    'bug_fix',
    'high',
    'open',
    0.92,
    'demo-user-001',
    GETUTCDATE(),
    GETUTCDATE()
  );

IF NOT EXISTS (SELECT 1 FROM sr_requests WHERE id = 'demo-sr-002')
  INSERT INTO sr_requests (id, org_id, title, description, sr_type, priority, status, confidence, requester_id, created_at, updated_at)
  VALUES (
    'demo-sr-002',
    'demo-org-001',
    'Add dark mode to dashboard',
    'Feature request to add dark mode theme support to the main dashboard.',
    'feature_request',
    'medium',
    'open',
    0.88,
    'demo-user-001',
    GETUTCDATE(),
    GETUTCDATE()
  );

IF NOT EXISTS (SELECT 1 FROM sr_requests WHERE id = 'demo-sr-003')
  INSERT INTO sr_requests (id, org_id, title, description, sr_type, priority, status, confidence, requester_id, created_at, updated_at)
  VALUES (
    'demo-sr-003',
    'demo-org-001',
    'Upgrade Node.js to v22 LTS',
    'Infrastructure SR to upgrade runtime from Node.js 20 to 22 LTS.',
    'infra_change',
    'low',
    'open',
    0.95,
    'demo-user-001',
    GETUTCDATE(),
    GETUTCDATE()
  );
