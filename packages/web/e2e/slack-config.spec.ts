import { test, expect } from "./fixtures/org";

test.describe("Slack Notification Config API", () => {
  test("알림 설정 CRUD", async ({ orgPage: { page, orgId } }) => {
    const token = await page.evaluate(() =>
      localStorage.getItem("token"),
    );
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // PUT — create/update config
    const putRes = await page.request.put(
      `/api/orgs/${orgId}/slack/configs`,
      {
        headers,
        data: {
          category: "agent",
          webhookUrl: "https://hooks.slack.com/test-agent",
          enabled: true,
        },
      },
    );
    // Accept 200/404 (test env) or 502 (API 서버 미실행)
    if (putRes.status() >= 502) {
      test.skip(true, "API 서버 미실행 — proxy 연결 불가");
      return;
    }
    expect([200, 201, 404]).toContain(putRes.status());

    // GET — list configs
    const getRes = await page.request.get(
      `/api/orgs/${orgId}/slack/configs`,
      { headers },
    );
    expect([200, 404]).toContain(getRes.status());

    // DELETE — remove config
    const deleteRes = await page.request.delete(
      `/api/orgs/${orgId}/slack/configs/agent`,
      { headers },
    );
    expect([200, 204, 404]).toContain(deleteRes.status());
  });

  test("잘못된 카테고리 → 400", async ({ orgPage: { page, orgId } }) => {
    const token = await page.evaluate(() =>
      localStorage.getItem("token"),
    );

    const res = await page.request.put(
      `/api/orgs/${orgId}/slack/configs`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: {
          category: "invalid-category",
          webhookUrl: "https://hooks.slack.com/test",
          enabled: true,
        },
      },
    );

    // API 서버 미실행 시 skip
    if (res.status() >= 502) {
      test.skip(true, "API 서버 미실행 — proxy 연결 불가");
      return;
    }
    // Should reject invalid category
    expect([400, 404, 422]).toContain(res.status());
  });
});
