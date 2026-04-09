/**
 * Shared Org Membership 테스트
 *
 * 환경변수 `DEFAULT_SHARED_ORG_ID`가 설정돼 있으면
 * signup/setup-password/google 플로우에서 개인 Org 대신 공유 Org에 멤버십을 부여하는지 검증.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { app } from "../app.js";
import { createTestEnv } from "./helpers/test-app.js";

const SHARED_ORG_ID = "org_axbd";

describe("Shared Org Mode (DEFAULT_SHARED_ORG_ID)", () => {
  let env: ReturnType<typeof createTestEnv> & { DEFAULT_SHARED_ORG_ID?: string };

  beforeEach(() => {
    env = { ...createTestEnv(), DEFAULT_SHARED_ORG_ID: SHARED_ORG_ID };
  });

  it("signup: 신규 유저가 공유 Org에 소속된다", async () => {
    const res = await app.request(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "alice@kt.com", name: "Alice", password: "Pass1234" }),
      },
      env,
    );
    expect(res.status).toBe(201);

    // org_axbd가 생성됐는지 확인
    const orgRow = await env.DB
      .prepare("SELECT id, name FROM organizations WHERE id = ?")
      .bind(SHARED_ORG_ID)
      .first<{ id: string; name: string }>();
    expect(orgRow?.id).toBe(SHARED_ORG_ID);

    // 멤버십이 생성됐는지 확인
    const memberRow = await env.DB
      .prepare("SELECT org_id, role FROM org_members WHERE org_id = ? AND user_id = (SELECT id FROM users WHERE email = ?)")
      .bind(SHARED_ORG_ID, "alice@kt.com")
      .first<{ org_id: string; role: string }>();
    expect(memberRow?.org_id).toBe(SHARED_ORG_ID);
    expect(memberRow?.role).toBe("member");

    // 개인 Org가 **생성되지 않았는지** 확인 (alice 개인 Org 미존재)
    const personal = await env.DB
      .prepare("SELECT id FROM organizations WHERE slug = ?")
      .bind("alice")
      .first();
    expect(personal).toBeNull();
  });

  it("signup: 두 명의 유저가 동일한 공유 Org를 공유한다 (멱등)", async () => {
    await app.request(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "u1@kt.com", name: "U1", password: "Pass1234" }),
      },
      env,
    );
    await app.request(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "u2@kt.com", name: "U2", password: "Pass1234" }),
      },
      env,
    );

    // 동일 org에 두 명의 멤버
    const members = await env.DB
      .prepare("SELECT user_id FROM org_members WHERE org_id = ?")
      .bind(SHARED_ORG_ID)
      .all<{ user_id: string }>();
    expect(members.results.length).toBe(2);

    // organizations 테이블에 org_axbd는 단 1건 (INSERT OR IGNORE 멱등성 검증)
    const orgCount = await env.DB
      .prepare("SELECT COUNT(*) as cnt FROM organizations WHERE id = ?")
      .bind(SHARED_ORG_ID)
      .first<{ cnt: number }>();
    expect(orgCount?.cnt).toBe(1);
  });

  it("signup 응답 JWT의 orgId가 공유 Org를 가리킨다", async () => {
    const res = await app.request(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "bob@kt.com", name: "Bob", password: "Pass1234" }),
      },
      env,
    );
    const data = (await res.json()) as { accessToken: string };
    // JWT payload의 orgId 추출 (Base64 디코드)
    const payload = JSON.parse(
      Buffer.from(data.accessToken.split(".")[1]!, "base64url").toString(),
    );
    expect(payload.orgId).toBe(SHARED_ORG_ID);
  });

  it("fallback: env 미설정 시 개인 Org 생성 (기존 동작 유지)", async () => {
    const fallbackEnv = createTestEnv(); // DEFAULT_SHARED_ORG_ID 없음
    const res = await app.request(
      "/api/auth/signup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "solo@kt.com", name: "Solo", password: "Pass1234" }),
      },
      fallbackEnv,
    );
    expect(res.status).toBe(201);

    // 공유 Org는 생성되지 않음
    const shared = await fallbackEnv.DB
      .prepare("SELECT id FROM organizations WHERE id = ?")
      .bind(SHARED_ORG_ID)
      .first();
    expect(shared).toBeNull();

    // 개인 Org는 생성됨
    const personal = await fallbackEnv.DB
      .prepare("SELECT id FROM organizations WHERE slug = ?")
      .bind("solo")
      .first();
    expect(personal).not.toBeNull();
  });
});
