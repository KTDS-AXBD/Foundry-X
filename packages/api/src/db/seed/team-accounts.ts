/**
 * AX 컨설팅팀 (구 AX BD팀) 계정 시드 데이터
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
  // 2026-04-20 신규 합류 (직급은 표시상 정보)
  { email: "eungjulee@gmail.com", name: "이응주 책임", role: "member" as const },
  { email: "namtank3@gmail.com", name: "남윤서 전임", role: "member" as const },
  { email: "hahaha8176@gmail.com", name: "정한수 책임", role: "member" as const },
  { email: "jerrygogo2002@gmail.com", name: "이원근 책임", role: "member" as const },
] as const;

export const DEFAULT_ORG_ID = "org_axbd";
