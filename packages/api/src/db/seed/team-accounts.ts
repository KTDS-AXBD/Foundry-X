/**
 * AX BD 팀 계정 시드 데이터
 * 실제 이메일은 bulk signup API 호출 시 지정 — 여기는 구조 예시
 */
export const TEAM_ACCOUNTS = [
  { email: "minwon.seo@kt.com", name: "서민원", role: "admin" as const },
  { email: "kiwook.kim@kt.com", name: "김기욱", role: "admin" as const },
  { email: "jungwon.kim@kt.com", name: "김정원", role: "admin" as const },
  { email: "kyungim.lee@kt.com", name: "이경임", role: "member" as const },
  { email: "hyunwoo.park@kt.com", name: "박현우", role: "member" as const },
  { email: "jimin.choi@kt.com", name: "최지민", role: "member" as const },
  { email: "sungho.jung@kt.com", name: "정성호", role: "member" as const },
  { email: "axbd.shared@kt.com", name: "AX BD 공용", role: "member" as const },
] as const;

export const DEFAULT_ORG_ID = "org_axbd";
