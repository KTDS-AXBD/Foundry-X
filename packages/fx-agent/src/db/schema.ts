import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ── Users ──────────────────────────────────────
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["admin", "member", "viewer"] })
    .notNull()
    .default("member"),
  passwordHash: text("password_hash"),
  authProvider: text("auth_provider").default("email"),
  providerId: text("provider_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ── Projects ───────────────────────────────────
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  repoUrl: text("repo_url").notNull(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  lastSyncAt: text("last_sync_at"),
  createdAt: text("created_at").notNull(),
});

// ── Wiki Pages ─────────────────────────────────
export const wikiPages = sqliteTable("wiki_pages", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  filePath: text("file_path"),
  ownershipMarker: text("ownership_marker").notNull().default("human"),
  updatedBy: text("updated_by").references(() => users.id),
  updatedAt: text("updated_at").notNull(),
});

// ── Token Usage ────────────────────────────────
export const tokenUsage = sqliteTable("token_usage", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  agentName: text("agent_name").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costUsd: real("cost_usd").notNull().default(0),
  recordedAt: text("recorded_at").notNull(),
});

// ── Agent Sessions ─────────────────────────────
export const agentSessions = sqliteTable("agent_sessions", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  agentName: text("agent_name").notNull(),
  branch: text("branch"),
  status: text("status", {
    enum: ["active", "completed", "failed", "escalated"],
  })
    .notNull()
    .default("active"),
  progress: real("progress").default(0),
  currentTask: text("current_task"),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
});

// ── Refresh Tokens ─────────────────────────────
export const refreshTokens = sqliteTable("refresh_tokens", {
  jti: text("jti").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: text("expires_at").notNull(),
  revokedAt: text("revoked_at"),
});

// ── Agents (Sprint 9 F50) ─────────────────────
export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").default(""),
  status: text("status", { enum: ["active", "inactive"] })
    .notNull()
    .default("active"),
  createdAt: text("created_at").notNull(),
});

// ── Agent Capabilities ────────────────────────
export const agentCapabilities = sqliteTable("agent_capabilities", {
  id: text("id").primaryKey(),
  agentId: text("agent_id")
    .notNull()
    .references(() => agents.id),
  name: text("name").notNull(),
  description: text("description").default(""),
  tools: text("tools").notNull().default("[]"),
  allowedPaths: text("allowed_paths").notNull().default("[]"),
  maxConcurrency: integer("max_concurrency").notNull().default(1),
  createdAt: text("created_at").notNull(),
});

// ── Agent Constraints ─────────────────────────
export const agentConstraints = sqliteTable("agent_constraints", {
  id: text("id").primaryKey(),
  tier: text("tier", { enum: ["always", "ask", "never"] }).notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  enforcementMode: text("enforcement_mode", {
    enum: ["block", "warn", "log"],
  })
    .notNull()
    .default("block"),
});

// ── Agent Tasks ───────────────────────────────
export const agentTasks = sqliteTable("agent_tasks", {
  id: text("id").primaryKey(),
  agentSessionId: text("agent_session_id")
    .notNull()
    .references(() => agentSessions.id),
  branch: text("branch").notNull(),
  prNumber: integer("pr_number"),
  prStatus: text("pr_status", {
    enum: ["draft", "open", "merged", "closed"],
  })
    .notNull()
    .default("draft"),
  sddVerified: integer("sdd_verified").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
