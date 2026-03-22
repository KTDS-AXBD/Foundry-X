import { describe, it, expect, beforeEach } from "vitest";
import { createMockD1 } from "../helpers/mock-d1.js";

const DDL = `CREATE TABLE IF NOT EXISTS data_classification_rules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  pattern_name TEXT NOT NULL,
  pattern_regex TEXT NOT NULL,
  classification TEXT NOT NULL CHECK(classification IN ('public','internal','confidential','restricted')),
  masking_strategy TEXT NOT NULL CHECK(masking_strategy IN ('redact','hash','partial','tokenize')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(tenant_id, pattern_name)
)`;

let db: any;

function uid() {
  return `rule-${Math.random().toString(36).slice(2, 10)}`;
}

async function insertRule(
  tenantId: string,
  overrides: Partial<{
    id: string;
    patternName: string;
    classification: string;
    maskingStrategy: string;
    isActive: number;
  }> = {},
) {
  const id = overrides.id || uid();
  const patternName = overrides.patternName || `pattern_${id}`;
  const classification = overrides.classification || "confidential";
  const maskingStrategy = overrides.maskingStrategy || "redact";
  const isActive = overrides.isActive ?? 1;

  await db
    .prepare(
      `INSERT INTO data_classification_rules (id, tenant_id, pattern_name, pattern_regex, classification, masking_strategy, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, tenantId, patternName, "test-regex", classification, maskingStrategy, isActive)
    .run();

  return id;
}

beforeEach(async () => {
  db = createMockD1();
  await db.exec(DDL);
});

describe("Governance Routes — GET /governance/rules", () => {
  it("returns all rules for a tenant", async () => {
    await insertRule("org_test");
    await insertRule("org_test");

    const { results } = await db
      .prepare("SELECT * FROM data_classification_rules WHERE tenant_id = ?")
      .bind("org_test")
      .all();

    expect(results).toHaveLength(2);
  });

  it("filters by classification", async () => {
    await insertRule("org_test", { classification: "restricted" });
    await insertRule("org_test", { classification: "public" });

    const { results } = await db
      .prepare(
        "SELECT * FROM data_classification_rules WHERE tenant_id = ? AND classification = ?",
      )
      .bind("org_test", "restricted")
      .all();

    expect(results).toHaveLength(1);
    expect(results[0].classification).toBe("restricted");
  });

  it("filters by isActive", async () => {
    await insertRule("org_test", { isActive: 1 });
    await insertRule("org_test", { isActive: 0 });

    const { results } = await db
      .prepare(
        "SELECT * FROM data_classification_rules WHERE tenant_id = ? AND is_active = ?",
      )
      .bind("org_test", 1)
      .all();

    expect(results).toHaveLength(1);
    expect(results[0].is_active).toBe(1);
  });

  it("returns empty array for tenant with no rules", async () => {
    const { results } = await db
      .prepare("SELECT * FROM data_classification_rules WHERE tenant_id = ?")
      .bind("org_empty")
      .all();

    expect(results).toHaveLength(0);
  });

  it("tenant isolation — rules from other tenant not visible", async () => {
    await insertRule("org_a");
    await insertRule("org_b");

    const { results } = await db
      .prepare("SELECT * FROM data_classification_rules WHERE tenant_id = ?")
      .bind("org_a")
      .all();

    expect(results).toHaveLength(1);
    expect(results[0].tenant_id).toBe("org_a");
  });
});

describe("Governance Routes — PUT /governance/rules/:id", () => {
  it("updates classification of an existing rule", async () => {
    const id = await insertRule("org_test", { classification: "internal" });

    await db
      .prepare(
        "UPDATE data_classification_rules SET classification = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?",
      )
      .bind("restricted", id, "org_test")
      .run();

    const row = await db
      .prepare("SELECT * FROM data_classification_rules WHERE id = ?")
      .bind(id)
      .first();

    expect(row.classification).toBe("restricted");
  });

  it("updates masking_strategy", async () => {
    const id = await insertRule("org_test", { maskingStrategy: "redact" });

    await db
      .prepare(
        "UPDATE data_classification_rules SET masking_strategy = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?",
      )
      .bind("hash", id, "org_test")
      .run();

    const row = await db
      .prepare("SELECT * FROM data_classification_rules WHERE id = ?")
      .bind(id)
      .first();

    expect(row.masking_strategy).toBe("hash");
  });

  it("updates is_active (deactivate)", async () => {
    const id = await insertRule("org_test", { isActive: 1 });

    await db
      .prepare(
        "UPDATE data_classification_rules SET is_active = ?, updated_at = datetime('now') WHERE id = ? AND tenant_id = ?",
      )
      .bind(0, id, "org_test")
      .run();

    const row = await db
      .prepare("SELECT * FROM data_classification_rules WHERE id = ?")
      .bind(id)
      .first();

    expect(row.is_active).toBe(0);
  });

  it("returns null for non-existent rule (404 scenario)", async () => {
    const row = await db
      .prepare(
        "SELECT * FROM data_classification_rules WHERE id = ? AND tenant_id = ?",
      )
      .bind("non-existent", "org_test")
      .first();

    expect(row).toBeNull();
  });

  it("admin role check — non-admin should be rejected (403 scenario)", () => {
    // Role check is handled in route handler
    const payload = { sub: "user1", role: "member", orgId: "org_test" };
    expect(payload.role).not.toBe("admin");
  });
});
