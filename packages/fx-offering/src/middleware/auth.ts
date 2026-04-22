// F569: harness-kit createAuthMiddleware 적용 — F541 중복 구현 교체
import { createAuthMiddleware } from "@foundry-x/harness-kit";

export const authMiddleware = createAuthMiddleware({
  serviceName: "fx-offering",
  serviceId: "foundry-x",
  corsOrigins: [],
  publicPaths: ["/api/offering/health"],
});
