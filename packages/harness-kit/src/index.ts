// Middleware
export {
  createAuthMiddleware,
  createCorsMiddleware,
  rbac,
  errorHandler,
  HarnessError,
} from "./middleware/index.js";
export type { JwtPayload, Role } from "./middleware/index.js";

// Types
export type {
  ServiceId,
  HarnessEnv,
  HarnessConfig,
  ScaffoldOptions,
} from "./types.js";

// D1
export { getDb, runQuery, runExec } from "./d1/index.js";

// Events
export { NoopEventBus } from "./events/index.js";
export type {
  EventType,
  DomainEvent,
  EventPublisher,
  EventSubscriber,
  EventBus,
} from "./events/index.js";

// ESLint
export { harnessKitPlugin } from "./eslint/index.js";
