/**
 * Shared Org Membership Helper
 *
 * 테스트 환경에서 모든 신규 가입자를 동일한 Org(`DEFAULT_SHARED_ORG_ID`)에 소속시키기 위한 유틸.
 *
 * 동작:
 * - `env.DEFAULT_SHARED_ORG_ID`가 설정돼 있으면 해당 Org에 멤버십을 보장하고
 *   `{ orgId, orgRole }`을 반환
 * - 미설정이면 `null` 반환 → 호출부는 기존 "개인 Org 생성" 경로로 폴백
 *
 * 멱등성:
 * - organizations/org_members 양쪽 모두 `INSERT OR IGNORE`로 이미 존재 시 no-op
 * - 기존 멤버가 재호출해도 안전
 */
import type { Env } from "../../../env.js";

export type SharedOrgRole = "owner" | "admin" | "member" | "viewer";

export interface SharedOrgMembership {
  orgId: string;
  orgRole: SharedOrgRole;
}

/**
 * 공유 Org 멤버십을 보장한다 (멱등).
 *
 * @param env  Worker 환경 바인딩
 * @param userId  멤버십을 추가할 사용자 ID
 * @param role  부여할 역할 (기본 "member")
 * @returns 공유 Org가 설정돼 있으면 `{ orgId, orgRole }`, 아니면 `null`
 */
export async function ensureSharedOrgMembership(
  env: Env,
  userId: string,
  role: SharedOrgRole = "member",
): Promise<SharedOrgMembership | null> {
  const sharedOrgId = env.DEFAULT_SHARED_ORG_ID;
  if (!sharedOrgId) return null;

  // Org 자체를 먼저 보장 (INSERT OR IGNORE — 이미 있으면 no-op)
  // 주의: name/slug는 Org가 최초로 만들어질 때만 사용됨. 기존 Org가 있으면 보존됨.
  const slug = sharedOrgId.replace(/^org_/, "");
  await env.DB.prepare(
    "INSERT OR IGNORE INTO organizations (id, name, slug) VALUES (?, ?, ?)",
  )
    .bind(sharedOrgId, "AX BD", slug)
    .run();

  // 멤버십 보장 (INSERT OR IGNORE — 이미 멤버면 no-op, role 유지)
  await env.DB.prepare(
    "INSERT OR IGNORE INTO org_members (org_id, user_id, role) VALUES (?, ?, ?)",
  )
    .bind(sharedOrgId, userId, role)
    .run();

  return { orgId: sharedOrgId, orgRole: role };
}
