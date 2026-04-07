import { randomUUID } from "crypto";
import type {
  CustomValidationRule,
  CreateCustomRuleInput,
  UpdateCustomRuleInput,
  RuleConditionInput,
} from "../schemas/custom-rule.schema.js";

interface RuleRow {
  id: string;
  org_id: string;
  name: string;
  description: string;
  weight: number;
  threshold: number;
  conditions: string;
  is_active: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

function rowToRule(row: RuleRow): CustomValidationRule {
  return {
    id: row.id,
    org_id: row.org_id,
    name: row.name,
    description: row.description,
    weight: row.weight,
    threshold: row.threshold,
    conditions: JSON.parse(row.conditions) as RuleConditionInput[],
    is_active: row.is_active === 1,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class CustomRuleService {
  constructor(private db: D1Database) {}

  async list(orgId: string): Promise<{ items: CustomValidationRule[]; total: number }> {
    const result = await this.db
      .prepare("SELECT * FROM custom_validation_rules WHERE org_id = ? ORDER BY created_at DESC")
      .bind(orgId)
      .all<RuleRow>();
    const items = (result.results ?? []).map(rowToRule);
    return { items, total: items.length };
  }

  async create(orgId: string, userId: string, data: CreateCustomRuleInput): Promise<CustomValidationRule> {
    const id = randomUUID();
    const now = new Date().toISOString();
    await this.db
      .prepare(
        `INSERT INTO custom_validation_rules
         (id, org_id, name, description, weight, threshold, conditions, is_active, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
      )
      .bind(id, orgId, data.name, data.description ?? "", data.weight ?? 0.2, data.threshold ?? 60, JSON.stringify(data.conditions), userId, now, now)
      .run();
    return {
      id,
      org_id: orgId,
      name: data.name,
      description: data.description ?? "",
      weight: data.weight ?? 0.2,
      threshold: data.threshold ?? 60,
      conditions: data.conditions,
      is_active: true,
      created_by: userId,
      created_at: now,
      updated_at: now,
    };
  }

  async getById(id: string, orgId: string): Promise<CustomValidationRule | null> {
    const row = await this.db
      .prepare("SELECT * FROM custom_validation_rules WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .first<RuleRow>();
    return row ? rowToRule(row) : null;
  }

  async update(id: string, orgId: string, data: UpdateCustomRuleInput): Promise<CustomValidationRule | null> {
    const existing = await this.getById(id, orgId);
    if (!existing) return null;

    const now = new Date().toISOString();
    const name = data.name ?? existing.name;
    const description = data.description ?? existing.description;
    const weight = data.weight ?? existing.weight;
    const threshold = data.threshold ?? existing.threshold;
    const conditions = data.conditions ?? existing.conditions;

    await this.db
      .prepare(
        `UPDATE custom_validation_rules
         SET name = ?, description = ?, weight = ?, threshold = ?, conditions = ?, updated_at = ?
         WHERE id = ? AND org_id = ?`
      )
      .bind(name, description, weight, threshold, JSON.stringify(conditions), now, id, orgId)
      .run();

    return { ...existing, name, description, weight, threshold, conditions, updated_at: now };
  }

  async delete(id: string, orgId: string): Promise<boolean> {
    const result = await this.db
      .prepare("DELETE FROM custom_validation_rules WHERE id = ? AND org_id = ?")
      .bind(id, orgId)
      .run();
    return (result.meta.changes ?? 0) > 0;
  }

  async toggleActivate(id: string, orgId: string): Promise<{ id: string; is_active: boolean } | null> {
    const existing = await this.getById(id, orgId);
    if (!existing) return null;
    const newActive = !existing.is_active ? 1 : 0;
    const now = new Date().toISOString();
    await this.db
      .prepare("UPDATE custom_validation_rules SET is_active = ?, updated_at = ? WHERE id = ? AND org_id = ?")
      .bind(newActive, now, id, orgId)
      .run();
    return { id, is_active: newActive === 1 };
  }

  async getActiveRules(orgId: string): Promise<CustomValidationRule[]> {
    const result = await this.db
      .prepare("SELECT * FROM custom_validation_rules WHERE org_id = ? AND is_active = 1 ORDER BY created_at ASC")
      .bind(orgId)
      .all<RuleRow>();
    return (result.results ?? []).map(rowToRule);
  }
}
