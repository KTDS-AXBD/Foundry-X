// F609: cross-domain contract re-exports
// External callers must import from this file, not from internal services/

export { GenerateInsightSchema } from "./schemas/bmc-insight.schema.js";
export { BmcInsightService } from "./services/bmc-insight-service.js";
export { BMC_BLOCK_TYPES } from "./services/bmc-service.js";
export { BdArtifactService } from "./services/bd-artifact-service.js";
export type { SectionReviewInput } from "./schemas/hitl-section.schema.js";

// F610: biz-items.ts cross-domain caller re-exports
export { BizPersonaEvaluator, EvaluationError, savePrdPersonaEvaluations, getPrdPersonaEvaluations } from "./services/biz-persona-evaluator.js";
export { SixHatsDebateService, SixHatsDebateError } from "./services/sixhats-debate.js";
export { SetDiscoveryTypeSchema } from "./schemas/viability-checkpoint.schema.js";

// F612: Pass 5 — multi-domain caller re-exports
export { BdSkillExecutor } from "./services/bd-skill-executor.js";
export { ShapingOrchestratorService } from "./services/shaping-orchestrator-service.js";
