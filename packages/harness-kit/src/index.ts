// Middleware
export {
  createAuthMiddleware,
  createCorsMiddleware,
  rbac,
  errorHandler,
  HarnessError,
  createStranglerMiddleware,
} from "./middleware/index.js";
export type { JwtPayload, Role, StranglerRoute, StranglerConfig } from "./middleware/index.js";

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
export { NoopEventBus, D1EventBus, createEvent } from "./events/index.js";
export type {
  EventType,
  DomainEvent,
  EventPublisher,
  EventSubscriber,
  EventBus,
  D1LikeDatabase,
} from "./events/index.js";

// ESLint
export { harnessKitPlugin } from "./eslint/index.js";
