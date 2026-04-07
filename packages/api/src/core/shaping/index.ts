// core/shaping — Shaping module (Phase 20-A: F397, Sprint 184)
// 형상화 도메인 (S3): BMC, Viability, Prototypes, Skills, Persona Eval
// ⚠️ Insights route는 F401에서 core/collection으로 분리됨
// 13 routes
export { shapingRoute } from "./routes/shaping.js";
export { axBdBmcRoute } from "./routes/ax-bd-bmc.js";
export { axBdAgentRoute } from "./routes/ax-bd-agent.js";
export { axBdCommentsRoute } from "./routes/ax-bd-comments.js";
export { axBdHistoryRoute } from "./routes/ax-bd-history.js";
export { axBdLinksRoute } from "./routes/ax-bd-links.js";
export { axBdViabilityRoute } from "./routes/ax-bd-viability.js";
export { axBdPrototypesRoute } from "./routes/ax-bd-prototypes.js";
export { axBdSkillsRoute } from "./routes/ax-bd-skills.js";
export { axBdPersonaEvalRoute } from "./routes/ax-bd-persona-eval.js";
export { axBdProgressRoute } from "./routes/ax-bd-progress.js";
export { personaConfigsRoute } from "./routes/persona-configs.js";
export { personaEvalsRoute } from "./routes/persona-evals.js";
