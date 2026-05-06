// F618: SkillRegistry — Foundry-X Skill Runtime 등록/조회
import { AuditBus, generateTraceId, generateSpanId } from "../../infra/types.js";
import type { SkillEntry } from "../types.js";

function makeCtx() {
  return { traceId: generateTraceId(), spanId: generateSpanId(), sampled: true };
}

export class SkillRegistryService {
  constructor(
    private db: D1Database,
    private auditBus: Pick<AuditBus, "emit">,
  ) {}

  async register(skill: {
    skillId: string;
    skillVersion: string;
    meta?: Record<string, unknown>;
  }): Promise<SkillEntry> {
    const now = Date.now();
    const meta = skill.meta ?? {};
    await this.db
      .prepare(
        `INSERT INTO skill_registry_entries (skill_id, skill_version, skill_meta, active, registered_at)
         VALUES (?, ?, ?, 1, ?)
         ON CONFLICT (skill_id) DO UPDATE SET
           skill_version = excluded.skill_version,
           skill_meta = excluded.skill_meta,
           active = 1,
           registered_at = ?`,
      )
      .bind(skill.skillId, skill.skillVersion, JSON.stringify(meta), now, now)
      .run();

    await this.auditBus.emit(
      "launch.skill_registered",
      { skillId: skill.skillId, skillVersion: skill.skillVersion },
      makeCtx(),
    );

    return {
      skillId: skill.skillId,
      skillVersion: skill.skillVersion,
      skillMeta: meta,
      active: true,
      registeredAt: now,
    };
  }

  async lookup(skillId: string): Promise<SkillEntry | null> {
    const row = await this.db
      .prepare(
        "SELECT skill_id, skill_version, skill_meta, active, registered_at FROM skill_registry_entries WHERE skill_id = ?",
      )
      .bind(skillId)
      .first<{ skill_id: string; skill_version: string; skill_meta: string; active: number; registered_at: number }>();

    if (!row) return null;
    return {
      skillId: row.skill_id,
      skillVersion: row.skill_version,
      skillMeta: JSON.parse(row.skill_meta ?? "{}"),
      active: row.active === 1,
      registeredAt: row.registered_at,
    };
  }

  async listActive(): Promise<SkillEntry[]> {
    const result = await this.db
      .prepare(
        "SELECT skill_id, skill_version, skill_meta, active, registered_at FROM skill_registry_entries WHERE active = 1",
      )
      .bind()
      .all<{ skill_id: string; skill_version: string; skill_meta: string; active: number; registered_at: number }>();

    return (result.results ?? []).map((row) => ({
      skillId: row.skill_id,
      skillVersion: row.skill_version,
      skillMeta: JSON.parse(row.skill_meta ?? "{}"),
      active: row.active === 1,
      registeredAt: row.registered_at,
    }));
  }
}
