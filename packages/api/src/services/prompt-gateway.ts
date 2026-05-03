/**
 * F149: PromptGatewayService — Prompt sanitization & code abstraction gateway
 * Strips secrets/PII/internal URLs before forwarding prompts to LLM backends.
 */
import type { AgentTaskType } from "./agent/execution-types.js";
import { AuditLogService } from "../core/harness/services/audit-logger.js";

// ── Interfaces ──────────────────────────────────────────

export interface SanitizationRule {
  id: string;
  pattern: string;
  replacement: string;
  category: "secret" | "url" | "pii" | "custom";
  enabled: boolean;
  createdAt: string;
}

export interface SanitizeResult {
  sanitizedContent: string;
  appliedRules: Array<{ ruleId: string; category: string; matchCount: number }>;
  originalLength: number;
  sanitizedLength: number;
}

export interface CodeAbstraction {
  filePath: string;
  summary: string;
  imports: string[];
  exports: string[];
  lineCount: number;
}

// ── Service ─────────────────────────────────────────────

export class PromptGatewayService {
  static readonly DEFAULT_RULES: SanitizationRule[] = [
    {
      id: "default-secret",
      pattern: String.raw`(?:api[_-]?key|token|secret)\s*[:=]\s*['"][^'"]{8,}['"]`,
      replacement: "[REDACTED_SECRET]",
      category: "secret",
      enabled: true,
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "default-password",
      pattern: String.raw`(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]+['"]`,
      replacement: "[REDACTED_PASSWORD]",
      category: "secret",
      enabled: true,
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "default-internal-url",
      pattern: String.raw`https?://(?:internal|staging|dev|localhost)[^\s'"]*`,
      replacement: "[REDACTED_INTERNAL_URL]",
      category: "url",
      enabled: true,
      createdAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "default-jwt",
      pattern: String.raw`eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}`,
      replacement: "[REDACTED_JWT]",
      category: "secret",
      enabled: true,
      createdAt: "2026-01-01T00:00:00Z",
    },
  ];

  private db: D1Database;
  private auditLogger: AuditLogService;

  constructor(db: D1Database) {
    this.db = db;
    this.auditLogger = new AuditLogService(db);
  }

  /** Sanitize a prompt string, removing secrets/PII/internal URLs */
  async sanitizePrompt(content: string, tenantId?: string): Promise<SanitizeResult> {
    const rules = await this.loadRules();
    const result = this.applyRules(content, rules);

    // Sprint 47: 마스킹 발생 시 감사 로그 기록
    if (result.appliedRules.length > 0 && tenantId) {
      await this.auditLogger.logEvent({
        tenantId,
        eventType: "masking",
        metadata: {
          appliedRules: result.appliedRules,
          originalLength: result.originalLength,
          sanitizedLength: result.sanitizedLength,
        },
      }).catch(() => {
        // 감사 로그 실패가 마스킹을 차단하면 안 됨
      });
    }

    return result;
  }

  /** Extract structural abstractions from file contents (imports/exports/signatures only) */
  abstractCode(fileContents: Record<string, string>): Record<string, CodeAbstraction> {
    const result: Record<string, CodeAbstraction> = {};

    for (const [filePath, content] of Object.entries(fileContents)) {
      const lines = content.split("\n");
      const imports: string[] = [];
      const exports: string[] = [];
      const signatureParts: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (/^import\s/.test(trimmed)) {
          imports.push(trimmed);
        }
        if (/^export\s/.test(trimmed)) {
          exports.push(trimmed);
        }
        if (/^(?:export\s+)?(?:async\s+)?function\s+\w+/.test(trimmed)) {
          signatureParts.push(trimmed);
        }
        if (/^(?:export\s+)?class\s+\w+/.test(trimmed)) {
          signatureParts.push(trimmed);
        }
      }

      const summary = signatureParts.length > 0
        ? signatureParts.join("; ")
        : `${imports.length} imports, ${exports.length} exports`;

      result[filePath] = {
        filePath,
        summary,
        imports,
        exports,
        lineCount: lines.length,
      };
    }

    return result;
  }

  /** Load rules from D1 + DEFAULT_RULES fallback */
  async loadRules(): Promise<SanitizationRule[]> {
    try {
      const stmt = this.db.prepare(
        "SELECT id, pattern, replacement, category, enabled, created_at FROM prompt_sanitization_rules",
      );
      const { results } = await stmt.all<{
        id: string;
        pattern: string;
        replacement: string;
        category: string;
        enabled: number;
        created_at: string;
      }>();

      if (results && results.length > 0) {
        const dbRules: SanitizationRule[] = results.map((r) => ({
          id: r.id,
          pattern: r.pattern,
          replacement: r.replacement,
          category: r.category as SanitizationRule["category"],
          enabled: r.enabled === 1,
          createdAt: r.created_at,
        }));
        return [...PromptGatewayService.DEFAULT_RULES, ...dbRules];
      }
    } catch {
      // D1 table may not exist — fall back to defaults
    }

    return [...PromptGatewayService.DEFAULT_RULES];
  }

  /** Apply enabled rules to content, returning sanitized result + metrics */
  applyRules(content: string, rules: SanitizationRule[]): SanitizeResult {
    const originalLength = content.length;
    let sanitized = content;
    const appliedRules: SanitizeResult["appliedRules"] = [];

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const regex = new RegExp(rule.pattern, "gi");
      let matchCount = 0;
      sanitized = sanitized.replace(regex, () => {
        matchCount++;
        return rule.replacement;
      });

      if (matchCount > 0) {
        appliedRules.push({
          ruleId: rule.id,
          category: rule.category,
          matchCount,
        });
      }
    }

    return {
      sanitizedContent: sanitized,
      appliedRules,
      originalLength,
      sanitizedLength: sanitized.length,
    };
  }

  /** List all rules (D1 + defaults) */
  async listRules(): Promise<SanitizationRule[]> {
    return this.loadRules();
  }
}
