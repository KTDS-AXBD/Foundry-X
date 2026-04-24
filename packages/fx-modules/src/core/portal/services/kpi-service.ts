export type KpiCategory = "market" | "tech" | "revenue" | "risk" | "custom";

export interface Kpi {
  id: string;
  evalId: string;
  name: string;
  category: KpiCategory;
  target: number;
  actual: number | null;
  unit: string;
  achievement: number | null;
  updatedAt: number;
}

export function calculateAchievement(target: number, actual: number | null): number | null {
  if (actual === null) return null;
  if (target === 0) return actual === 0 ? 100 : 0;
  return Math.round((actual / target) * 100);
}

function rowToKpi(row: Record<string, unknown>): Kpi {
  const target = row.target as number;
  const actual = row.actual !== null && row.actual !== undefined ? (row.actual as number) : null;
  return {
    id: row.id as string,
    evalId: row.eval_id as string,
    name: row.name as string,
    category: row.category as KpiCategory,
    target,
    actual,
    unit: row.unit as string,
    achievement: calculateAchievement(target, actual),
    updatedAt: row.updated_at as number,
  };
}

export class KpiService {
  constructor(private db: D1Database) {}

  async create(
    evalId: string,
    data: { name: string; category: KpiCategory; target: number; unit?: string },
  ): Promise<Kpi> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const unit = data.unit || "%";

    await this.db
      .prepare(
        `INSERT INTO ax_kpis (id, eval_id, name, category, target, actual, unit, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`,
      )
      .bind(id, evalId, data.name, data.category, data.target, unit, now)
      .run();

    return {
      id,
      evalId,
      name: data.name,
      category: data.category as KpiCategory,
      target: data.target,
      actual: null,
      unit,
      achievement: null,
      updatedAt: now,
    };
  }

  async listByEval(evalId: string): Promise<Kpi[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM ax_kpis WHERE eval_id = ? ORDER BY category, name")
      .bind(evalId)
      .all();

    return (results as Record<string, unknown>[]).map(rowToKpi);
  }

  async update(
    kpiId: string,
    evalId: string,
    data: { actual?: number | null; target?: number },
  ): Promise<Kpi> {
    const existing = await this.db
      .prepare("SELECT * FROM ax_kpis WHERE id = ? AND eval_id = ?")
      .bind(kpiId, evalId)
      .first();

    if (!existing) {
      throw new Error("KPI not found");
    }

    const now = Date.now();
    const newActual = data.actual !== undefined ? data.actual : (existing as Record<string, unknown>).actual as number | null;
    const newTarget = data.target !== undefined ? data.target : (existing as Record<string, unknown>).target as number;

    await this.db
      .prepare("UPDATE ax_kpis SET actual = ?, target = ?, updated_at = ? WHERE id = ? AND eval_id = ?")
      .bind(newActual, newTarget, now, kpiId, evalId)
      .run();

    return rowToKpi({
      ...(existing as Record<string, unknown>),
      actual: newActual,
      target: newTarget,
      updated_at: now,
    });
  }
}
