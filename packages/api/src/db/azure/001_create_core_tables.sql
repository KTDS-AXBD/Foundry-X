-- 001_create_core_tables.sql
-- Azure SQL (T-SQL) version of Foundry-X core tables.
-- Source: D1 migrations 0001_initial.sql, 0011_organizations.sql, 0012_add_org_id.sql, 0027_sr.sql
-- Covers: users, organizations, org_members, projects, sr_requests

-- =============================================================================
-- 1. users
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
CREATE TABLE users (
  id              NVARCHAR(255)   NOT NULL PRIMARY KEY,
  email           NVARCHAR(255)   NOT NULL UNIQUE,
  name            NVARCHAR(255)   NOT NULL,
  role            NVARCHAR(50)    NOT NULL DEFAULT 'member'
                    CHECK (role IN ('admin', 'member', 'viewer')),
  password_hash   NVARCHAR(MAX)   NULL,
  created_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  updated_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE()
);
GO

CREATE NONCLUSTERED INDEX idx_users_email ON users(email);
GO

-- =============================================================================
-- 2. organizations
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'organizations')
CREATE TABLE organizations (
  id              NVARCHAR(255)   NOT NULL PRIMARY KEY,
  name            NVARCHAR(255)   NOT NULL,
  slug            NVARCHAR(255)   NOT NULL UNIQUE,
  plan            NVARCHAR(50)    NOT NULL DEFAULT 'free'
                    CHECK (plan IN ('free', 'pro', 'enterprise')),
  settings        NVARCHAR(MAX)   NOT NULL DEFAULT '{}',
  created_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  updated_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE()
);
GO

CREATE NONCLUSTERED INDEX idx_org_slug ON organizations(slug);
GO

-- =============================================================================
-- 3. org_members (tenant_members equivalent)
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'org_members')
CREATE TABLE org_members (
  org_id          NVARCHAR(255)   NOT NULL,
  user_id         NVARCHAR(255)   NOT NULL,
  role            NVARCHAR(50)    NOT NULL DEFAULT 'member'
                    CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at       DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  PRIMARY KEY (org_id, user_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
GO

CREATE NONCLUSTERED INDEX idx_orgmember_user ON org_members(user_id);
GO

-- =============================================================================
-- 4. projects
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'projects')
CREATE TABLE projects (
  id              NVARCHAR(255)   NOT NULL PRIMARY KEY,
  name            NVARCHAR(255)   NOT NULL,
  repo_url        NVARCHAR(2048)  NOT NULL,
  owner_id        NVARCHAR(255)   NOT NULL,
  org_id          NVARCHAR(255)   NOT NULL DEFAULT '',
  last_sync_at    DATETIME2       NULL,
  created_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  FOREIGN KEY (owner_id) REFERENCES users(id),
  FOREIGN KEY (org_id)   REFERENCES organizations(id)
);
GO

CREATE NONCLUSTERED INDEX idx_projects_owner ON projects(owner_id);
CREATE NONCLUSTERED INDEX idx_projects_org   ON projects(org_id);
GO

-- =============================================================================
-- 5. sr_requests
-- =============================================================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'sr_requests')
CREATE TABLE sr_requests (
  id              NVARCHAR(255)   NOT NULL PRIMARY KEY,
  org_id          NVARCHAR(255)   NOT NULL,
  title           NVARCHAR(500)   NOT NULL,
  description     NVARCHAR(MAX)   NULL,
  sr_type         NVARCHAR(100)   NOT NULL,
  priority        NVARCHAR(50)    NOT NULL DEFAULT 'medium',
  status          NVARCHAR(50)    NOT NULL DEFAULT 'open',
  confidence      FLOAT           NULL DEFAULT 0,
  matched_keywords NVARCHAR(MAX)  NULL,
  requester_id    NVARCHAR(255)   NULL,
  workflow_id     NVARCHAR(255)   NULL,
  created_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  updated_at      DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
  closed_at       DATETIME2       NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);
GO

CREATE NONCLUSTERED INDEX idx_sr_requests_org    ON sr_requests(org_id);
CREATE NONCLUSTERED INDEX idx_sr_requests_status ON sr_requests(status);
CREATE NONCLUSTERED INDEX idx_sr_requests_type   ON sr_requests(sr_type);
GO
