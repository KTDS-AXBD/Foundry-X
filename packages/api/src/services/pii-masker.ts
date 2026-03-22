/**
 * F166: PiiMaskerService — PII detection & masking with pluggable strategies
 * Loads default + tenant-specific patterns from D1, applies masking per strategy.
 */
import { createHash, randomUUID } from "node:crypto";

// ── Interfaces ──────────────────────────────────────────

export interface PiiPattern {
  name: string;
  regex: RegExp;
  classification: "public" | "internal" | "confidential" | "restricted";
  maskStrategy: "redact" | "hash" | "partial" | "tokenize";
}

export interface PiiDetection {
  pattern: string;
  count: number;
  classification: string;
  maskStrategy: string;
}

export interface MaskResult {
  masked: string;
  detections: PiiDetection[];
  originalLength: number;
  maskedLength: number;
}

// ── Classification Level Ordering ───────────────────────

const CLASSIFICATION_LEVEL: Record<string, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
};

// ── Default Patterns ────────────────────────────────────

export const DEFAULT_PII_PATTERNS: PiiPattern[] = [
  {
    name: "email",
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    classification: "confidential",
    maskStrategy: "redact",
  },
  {
    name: "ssn_kr",
    regex: /\d{6}-?[1-4]\d{6}/g,
    classification: "restricted",
    maskStrategy: "redact",
  },
  {
    name: "phone_kr",
    regex: /01[0-9]-?\d{3,4}-?\d{4}/g,
    classification: "confidential",
    maskStrategy: "partial",
  },
  {
    name: "employee_id",
    regex: /[A-Z]{2,3}-?\d{5,8}/g,
    classification: "internal",
    maskStrategy: "hash",
  },
  {
    name: "ip_address",
    regex: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g,
    classification: "internal",
    maskStrategy: "partial",
  },
  {
    name: "credit_card",
    regex: /\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/g,
    classification: "restricted",
    maskStrategy: "redact",
  },
];

// ── Service ─────────────────────────────────────────────

export class PiiMaskerService {
  private db: D1Database;
  private patternsCache: PiiPattern[] | null = null;

  constructor(db: D1Database) {
    this.db = db;
  }

  /** Load tenant-specific patterns from DB + merge with defaults */
  async loadPatterns(tenantId?: string): Promise<PiiPattern[]> {
    const defaults = DEFAULT_PII_PATTERNS.map((p) => ({
      ...p,
      regex: new RegExp(p.regex.source, p.regex.flags),
    }));

    if (!tenantId) return defaults;

    try {
      const { results } = await this.db
        .prepare(
          "SELECT pattern_name, pattern_regex, classification, masking_strategy FROM data_classification_rules WHERE tenant_id = ? AND is_active = 1",
        )
        .bind(tenantId)
        .all<{
          pattern_name: string;
          pattern_regex: string;
          classification: string;
          masking_strategy: string;
        }>();

      if (results && results.length > 0) {
        const dbPatterns: PiiPattern[] = results.map((r) => ({
          name: r.pattern_name,
          regex: new RegExp(r.pattern_regex, "g"),
          classification: r.classification as PiiPattern["classification"],
          maskStrategy: r.masking_strategy as PiiPattern["maskStrategy"],
        }));
        return [...defaults, ...dbPatterns];
      }
    } catch {
      // DB table may not exist — fall back to defaults
    }

    return defaults;
  }

  /** Mask all PII in text */
  async mask(text: string, tenantId?: string): Promise<MaskResult> {
    if (!text) {
      return { masked: "", detections: [], originalLength: 0, maskedLength: 0 };
    }

    const patterns = await this.loadPatterns(tenantId);
    return this.applyPatterns(text, patterns);
  }

  /** Mask only PII at or above a minimum classification level */
  async maskAbove(
    text: string,
    minClassification: PiiPattern["classification"],
    tenantId?: string,
  ): Promise<MaskResult> {
    if (!text) {
      return { masked: "", detections: [], originalLength: 0, maskedLength: 0 };
    }

    const patterns = await this.loadPatterns(tenantId);
    const minLevel = CLASSIFICATION_LEVEL[minClassification] ?? 0;
    const filtered = patterns.filter(
      (p) => (CLASSIFICATION_LEVEL[p.classification] ?? 0) >= minLevel,
    );
    return this.applyPatterns(text, filtered);
  }

  /** Apply patterns to text and return mask result */
  private applyPatterns(text: string, patterns: PiiPattern[]): MaskResult {
    const originalLength = text.length;
    let masked = text;
    const detections: PiiDetection[] = [];

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let count = 0;

      masked = masked.replace(regex, (match) => {
        count++;
        return this.applyStrategy(match, pattern.name, pattern.maskStrategy);
      });

      if (count > 0) {
        detections.push({
          pattern: pattern.name,
          count,
          classification: pattern.classification,
          maskStrategy: pattern.maskStrategy,
        });
      }
    }

    return { masked, detections, originalLength, maskedLength: masked.length };
  }

  /** Apply masking strategy to a single match */
  private applyStrategy(
    value: string,
    patternName: string,
    strategy: PiiPattern["maskStrategy"],
  ): string {
    const label = patternName.toUpperCase();

    switch (strategy) {
      case "redact":
        return `[${label}_REDACTED]`;

      case "hash": {
        const hash = createHash("sha256").update(value).digest("hex").slice(0, 5);
        return `[${label}:${hash}]`;
      }

      case "partial": {
        if (patternName === "phone_kr") {
          // 010-****-1234 형식
          const digits = value.replace(/\D/g, "");
          const prefix = digits.slice(0, 3);
          const suffix = digits.slice(-4);
          return `${prefix}-****-${suffix}`;
        }
        if (patternName === "ip_address") {
          // 192.168.*.* 형식
          const parts = value.split(".");
          return `${parts[0]}.${parts[1]}.*.*`;
        }
        // 기본 partial: 앞 2자 + **** + 뒤 2자
        if (value.length <= 4) return "****";
        return `${value.slice(0, 2)}****${value.slice(-2)}`;
      }

      case "tokenize":
        return `[TOKEN:${randomUUID().slice(0, 8)}]`;

      default:
        return `[${label}_REDACTED]`;
    }
  }
}
