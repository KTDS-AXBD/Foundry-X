/** fx-gateway Workers 환경 바인딩 (F517: FX-REQ-545) */
export interface GatewayEnv {
  /** Service Binding — 기존 foundry-x-api Worker (잔여 도메인) */
  MAIN_API: Fetcher;
  /** Service Binding — fx-discovery Worker (F518 완료 후 활성화) */
  DISCOVERY?: Fetcher;
  /**
   * Discovery Worker 라우팅 스위치.
   * "true" 이면 /api/discovery/* 요청을 DISCOVERY binding으로 전송.
   * 미설정 또는 "false" 이면 MAIN_API로 폴백.
   */
  DISCOVERY_ENABLED?: string;
}
