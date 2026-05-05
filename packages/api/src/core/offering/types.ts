// F609: cross-domain contract re-exports
// External callers must import from this file, not from internal services/

export { AdaptToneEnum } from "./schemas/content-adapter.schema.js";
export type { AdaptTone } from "./schemas/content-adapter.schema.js";
export { OfferingService } from "./services/offering-service.js";
export { ContentAdapterService } from "./services/content-adapter-service.js";

// F610: biz-items.ts cross-domain caller re-exports
export { PrdConfirmationService } from "./services/prd-confirmation-service.js";
export { prdEditSchema, prdDiffQuerySchema } from "./schemas/prd-confirmation-schema.js";
export { PrdReviewPipeline, PipelineError } from "./services/prd-review-pipeline.js";
export { PrdGeneratorService } from "./services/prd-generator.js";
export { GeneratePrdSchema } from "./schemas/prd.js";
export { BusinessPlanGeneratorService } from "./services/business-plan-generator.js";
export { GenerateBusinessPlanSchema } from "./schemas/business-plan.js";
export { PrototypeGeneratorService } from "./services/prototype-generator.js";
export { BpHtmlParser } from "./services/bp-html-parser.js";
export { BpPrdGenerator } from "./services/bp-prd-generator.js";
export { PrdInterviewService } from "./services/prd-interview-service.js";
export { GeneratePrdFromBpSchema } from "./schemas/bp-prd.js";
export { StartInterviewSchema, AnswerInterviewSchema } from "./schemas/prd-interview.js";

// F611: offering D1 API — cross-domain callers import from here
export {
  queryLinkedOfferings,
  countOfferingSections,
  countOfferingVersions,
  queryOfferingPrototypeLinks,
  getOfferingSectionContents,
} from "./services/offering-d1-api.js";
