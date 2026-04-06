// ─── F361+F362: 운영 지표 타입 (Sprint 164, Phase 17) ───

/** F361: Rule 효과 측정 */
export interface RuleEffectiveness {
  proposalId: string;
  ruleFilename: string;
  patternId: string;
  preDeployFailures: number;
  postDeployFailures: number;
  effectivenessScore: number;
  measuredAt: string | null;
  status: "measuring" | "measured" | "insufficient_data";
}

export interface RuleEffectivenessResponse {
  items: RuleEffectiveness[];
  averageScore: number;
  totalRules: number;
  measuredRules: number;
}

/** F362: Skill 재사용률 */
export interface SkillReuseData {
  skillId: string;
  derivationType: "manual" | "derived" | "captured" | "forked";
  totalExecutions: number;
  reuseCount: number;
  reuseRate: number;
}

export interface SkillReuseResponse {
  items: SkillReuseData[];
  overallReuseRate: number;
  derivedCount: number;
  capturedCount: number;
}

/** F362: 에이전트/스킬 활용률 */
export interface AgentUsageData {
  source: string;
  month: string;
  eventCount: number;
  isUnused: boolean;
}

export interface AgentUsageResponse {
  items: AgentUsageData[];
  totalSources: number;
  activeSources: number;
  unusedSources: string[];
}

/** F362: 통합 운영 지표 */
export interface MetricsOverview {
  ruleEffectiveness: {
    averageScore: number;
    totalRules: number;
    measuredRules: number;
  };
  skillReuse: {
    overallReuseRate: number;
    derivedCount: number;
    capturedCount: number;
  };
  agentUsage: {
    totalSources: number;
    activeSources: number;
    unusedCount: number;
  };
  period: string;
}
