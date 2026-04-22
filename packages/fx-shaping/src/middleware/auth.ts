// F569: harness-kit createAuthMiddleware 적용 — F540 중복 구현 교체
import { createAuthMiddleware } from "@foundry-x/harness-kit";

export const authMiddleware = createAuthMiddleware({
  serviceName: "fx-shaping",
  serviceId: "foundry-x",
  corsOrigins: [],
  publicPaths: ["/api/shaping/health", "/api/ax-bd/health"],
});
