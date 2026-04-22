// F569: harness-kit createAuthMiddleware 적용 — F538 중복 구현 교체
import { createAuthMiddleware } from "@foundry-x/harness-kit";

export const authMiddleware = createAuthMiddleware({
  serviceName: "fx-discovery",
  serviceId: "discovery-x",
  corsOrigins: [],
  publicPaths: ["/api/discovery/health"],
});
