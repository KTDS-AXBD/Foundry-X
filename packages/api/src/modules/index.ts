// modules/ — Phase 20-A 모듈화 (이관 대상, 향후 별도 서비스로)
// Sprint 181: auth 모듈
export { authRoute, ssoRoute, tokenRoute, profileRoute, adminRoute } from "./auth/index.js";

// F572: portal/gate/launch → fx-modules Worker로 이관. 이 exports 삭제.

// Sprint 195: billing 모듈 (F411 과금 체계)
export { billingRoute } from "./billing/index.js";

// Sprint 184: infra 모듈 (예정)
