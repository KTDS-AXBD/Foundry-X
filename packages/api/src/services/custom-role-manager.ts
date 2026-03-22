/**
 * F146: 에이전트 역할 커스터마이징 — CustomRoleManager
 * 빌트인 7종 + D1 커스텀 역할 통합 관리
 */

export interface CustomRole {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  allowedTools: string[];
  preferredModel: string | null;
  preferredRunnerType: string;
  taskType: string;
  orgId: string;
  isBuiltin: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  systemPrompt: string;
  allowedTools?: string[];
  preferredModel?: string;
  preferredRunnerType?: string;
  taskType?: string;
  orgId?: string;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  systemPrompt?: string;
  allowedTools?: string[];
  preferredModel?: string | null;
  preferredRunnerType?: string;
  taskType?: string;
  enabled?: boolean;
}

export interface CustomRoleRow {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  allowed_tools: string;
  preferred_model: string | null;
  preferred_runner_type: string;
  task_type: string;
  org_id: string;
  is_builtin: number;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export function toCustomRole(row: CustomRoleRow): CustomRole {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    systemPrompt: row.system_prompt,
    allowedTools: JSON.parse(row.allowed_tools || "[]"),
    preferredModel: row.preferred_model,
    preferredRunnerType: row.preferred_runner_type,
    taskType: row.task_type,
    orgId: row.org_id,
    isBuiltin: row.is_builtin === 1,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 빌트인 7종 역할 정의 */
export const BUILTIN_ROLES: CustomRole[] = [
  {
    id: "builtin-reviewer",
    name: "reviewer",
    description: "Code review agent — PR diff 분석 및 리뷰 코멘트 생성",
    systemPrompt: "You are a code review agent. Analyze code changes and provide constructive feedback.",
    allowedTools: ["eslint", "prettier", "ast-grep"],
    preferredModel: null,
    preferredRunnerType: "openrouter",
    taskType: "code-review",
    orgId: "",
    isBuiltin: true,
    enabled: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "builtin-planner",
    name: "planner",
    description: "Planning agent — 작업 분해 및 실행 계획 수립",
    systemPrompt: "You are a planning agent. Break down tasks into actionable steps with clear dependencies.",
    allowedTools: ["file-reader", "spec-parser"],
    preferredModel: null,
    preferredRunnerType: "openrouter",
    taskType: "spec-analysis",
    orgId: "",
    isBuiltin: true,
    enabled: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "builtin-architect",
    name: "architect",
    description: "Architecture agent — 아키텍처 분석 및 설계 리뷰",
    systemPrompt: "You are an architecture agent. Analyze system architecture, dependencies, and design patterns.",
    allowedTools: ["dep-graph", "file-reader"],
    preferredModel: null,
    preferredRunnerType: "openrouter",
    taskType: "spec-analysis",
    orgId: "",
    isBuiltin: true,
    enabled: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "builtin-test",
    name: "test",
    description: "Test generation agent — 테스트 코드 생성 및 커버리지 분석",
    systemPrompt: "You are a test generation agent. Generate comprehensive test cases for the provided code.",
    allowedTools: ["vitest", "testing-library"],
    preferredModel: null,
    preferredRunnerType: "openrouter",
    taskType: "test-generation",
    orgId: "",
    isBuiltin: true,
    enabled: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "builtin-security",
    name: "security",
    description: "Security review agent — OWASP Top 10 취약점 스캔",
    systemPrompt: "You are a security review agent. Scan for OWASP Top 10 vulnerabilities and security anti-patterns.",
    allowedTools: ["semgrep", "eslint-security"],
    preferredModel: null,
    preferredRunnerType: "openrouter",
    taskType: "security-review",
    orgId: "",
    isBuiltin: true,
    enabled: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "builtin-qa",
    name: "qa",
    description: "QA testing agent — 브라우저 테스트 시나리오 생성 및 수용 기준 검증",
    systemPrompt: "You are a QA testing agent. Generate browser test scenarios and validate acceptance criteria.",
    allowedTools: ["playwright", "testing-library"],
    preferredModel: null,
    preferredRunnerType: "openrouter",
    taskType: "qa-testing",
    orgId: "",
    isBuiltin: true,
    enabled: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "builtin-infra",
    name: "infra",
    description: "Infrastructure agent — 인프라 구성 분석 및 최적화 제안",
    systemPrompt: "You are an infrastructure agent. Analyze infrastructure configurations and suggest optimizations.",
    allowedTools: ["wrangler", "terraform"],
    preferredModel: null,
    preferredRunnerType: "openrouter",
    taskType: "policy-evaluation",
    orgId: "",
    isBuiltin: true,
    enabled: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

export class CustomRoleManager {
  constructor(private db: D1Database) {}

  async createRole(input: CreateRoleInput): Promise<CustomRole> {
    const id = `role-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO custom_agent_roles
         (id, name, description, system_prompt, allowed_tools, preferred_model, preferred_runner_type, task_type, org_id, is_builtin, enabled, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
      )
      .bind(
        id,
        input.name,
        input.description ?? "",
        input.systemPrompt,
        JSON.stringify(input.allowedTools ?? []),
        input.preferredModel ?? null,
        input.preferredRunnerType ?? "openrouter",
        input.taskType ?? "code-review",
        input.orgId ?? "",
        now,
        now,
      )
      .run();

    return {
      id,
      name: input.name,
      description: input.description ?? "",
      systemPrompt: input.systemPrompt,
      allowedTools: input.allowedTools ?? [],
      preferredModel: input.preferredModel ?? null,
      preferredRunnerType: input.preferredRunnerType ?? "openrouter",
      taskType: input.taskType ?? "code-review",
      orgId: input.orgId ?? "",
      isBuiltin: false,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getRole(roleId: string): Promise<CustomRole | null> {
    // Check builtin first
    const builtin = BUILTIN_ROLES.find((r) => r.id === roleId);
    if (builtin) return builtin;

    const row = await this.db
      .prepare("SELECT * FROM custom_agent_roles WHERE id = ?")
      .bind(roleId)
      .first<CustomRoleRow>();

    if (!row) return null;
    return toCustomRole(row);
  }

  async listRoles(orgId?: string, includeDisabled?: boolean): Promise<CustomRole[]> {
    let query = "SELECT * FROM custom_agent_roles";
    const conditions: string[] = [];
    const bindings: unknown[] = [];

    if (orgId) {
      conditions.push("org_id = ?");
      bindings.push(orgId);
    }
    if (!includeDisabled) {
      conditions.push("enabled = 1");
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY name";

    const { results } = await this.db
      .prepare(query)
      .bind(...bindings)
      .all<CustomRoleRow>();

    const customRoles = results.map(toCustomRole);

    // Merge: builtins first, then custom
    const builtins = includeDisabled
      ? BUILTIN_ROLES
      : BUILTIN_ROLES.filter((r) => r.enabled);

    return [...builtins, ...customRoles];
  }

  async updateRole(roleId: string, input: UpdateRoleInput): Promise<CustomRole> {
    // Builtin roles cannot be updated
    const builtin = BUILTIN_ROLES.find((r) => r.id === roleId);
    if (builtin) {
      throw new Error("Cannot modify builtin role");
    }

    const existing = await this.db
      .prepare("SELECT * FROM custom_agent_roles WHERE id = ?")
      .bind(roleId)
      .first<CustomRoleRow>();

    if (!existing) {
      throw new Error("Role not found");
    }

    if (existing.is_builtin === 1) {
      throw new Error("Cannot modify builtin role");
    }

    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.name !== undefined) {
      updates.push("name = ?");
      values.push(input.name);
    }
    if (input.description !== undefined) {
      updates.push("description = ?");
      values.push(input.description);
    }
    if (input.systemPrompt !== undefined) {
      updates.push("system_prompt = ?");
      values.push(input.systemPrompt);
    }
    if (input.allowedTools !== undefined) {
      updates.push("allowed_tools = ?");
      values.push(JSON.stringify(input.allowedTools));
    }
    if (input.preferredModel !== undefined) {
      updates.push("preferred_model = ?");
      values.push(input.preferredModel);
    }
    if (input.preferredRunnerType !== undefined) {
      updates.push("preferred_runner_type = ?");
      values.push(input.preferredRunnerType);
    }
    if (input.taskType !== undefined) {
      updates.push("task_type = ?");
      values.push(input.taskType);
    }
    if (input.enabled !== undefined) {
      updates.push("enabled = ?");
      values.push(input.enabled ? 1 : 0);
    }

    updates.push("updated_at = ?");
    values.push(now);
    values.push(roleId);

    await this.db
      .prepare(`UPDATE custom_agent_roles SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();

    const updated = await this.db
      .prepare("SELECT * FROM custom_agent_roles WHERE id = ?")
      .bind(roleId)
      .first<CustomRoleRow>();

    return toCustomRole(updated!);
  }

  async deleteRole(roleId: string): Promise<void> {
    // Builtin roles cannot be deleted
    const builtin = BUILTIN_ROLES.find((r) => r.id === roleId);
    if (builtin) {
      throw new Error("Cannot delete builtin role");
    }

    const existing = await this.db
      .prepare("SELECT * FROM custom_agent_roles WHERE id = ?")
      .bind(roleId)
      .first<CustomRoleRow>();

    if (!existing) {
      throw new Error("Role not found");
    }

    if (existing.is_builtin === 1) {
      throw new Error("Cannot delete builtin role");
    }

    await this.db
      .prepare("DELETE FROM custom_agent_roles WHERE id = ?")
      .bind(roleId)
      .run();
  }
}
