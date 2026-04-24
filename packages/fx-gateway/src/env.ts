/** fx-gateway Workers 환경 바인딩 (F523: FX-REQ-551 — 하드와이어 방식) */
export interface GatewayEnv {
  /** Service Binding — 기존 foundry-x-api Worker (잔여 도메인) */
  MAIN_API: Fetcher;
  /** Service Binding — fx-discovery Worker (F523: 활성화 완료) */
  DISCOVERY: Fetcher;
  /** Service Binding — fx-shaping Worker (F540: Shaping 도메인 분리) */
  SHAPING: Fetcher;
  /** Service Binding — fx-offering Worker (F541: Offering 도메인 분리) */
  OFFERING: Fetcher;
  /** Service Binding — fx-modules Worker (F572: portal/gate/launch 통합) */
  MODULES: Fetcher;
}
