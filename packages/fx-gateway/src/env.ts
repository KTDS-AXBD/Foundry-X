/** fx-gateway Workers 환경 바인딩 (F517: FX-REQ-545) */
export interface GatewayEnv {
  /** Service Binding — 기존 foundry-x-api Worker (잔여 도메인) */
  MAIN_API: Fetcher;
  /** Service Binding — fx-discovery Worker (F518 완료 후 활성화) */
  DISCOVERY?: Fetcher;
}
