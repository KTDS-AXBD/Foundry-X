export interface RuleEffectiveness {
  id: string;
  status: "measured" | "pending" | "error";
  effectivenessScore: number;
}

export class RuleEffectivenessService {
  constructor(_db: D1Database) {}

  async measureAll(_tenantId: string, _windowDays = 14): Promise<RuleEffectiveness[]> {
    return [];
  }
}
