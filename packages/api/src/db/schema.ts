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
  slug: text("slug").notNull(),
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
