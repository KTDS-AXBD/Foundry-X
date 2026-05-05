// F609: cross-domain contract re-exports
// External callers must import from this file, not from internal services/

export { DiscoveryXIngestService } from "./services/discovery-x-ingest-service.js";
export { discoveryIngestPayloadSchema } from "./schemas/discovery-x.schema.js";
export { IdeaService } from "./services/idea-service.js";
export type { Idea } from "./services/idea-service.js";
