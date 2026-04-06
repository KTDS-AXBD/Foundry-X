// F356: Slack Notification Service 테스트 (Sprint 160)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { SlackNotificationService } from "../modules/portal/services/slack-notification-service.js";

describe("SlackNotificationService", () => {
  const event = {
    type: "build_complete" as const,
    jobId: "job_1",
    jobTitle: "Test Prototype",
    detail: "Build completed in 30s",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("webhook URL 없으면 false 반환하고 에러 안 나요", async () => {
    const svc = new SlackNotificationService();
    const result = await svc.notify(event);
    expect(result).toBe(false);
  });

  it("webhook URL 있으면 fetch 호출해요", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("ok", { status: 200 }),
    );

    const svc = new SlackNotificationService("https://hooks.slack.com/test");
    const result = await svc.notify(event);

    expect(result).toBe(true);
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://hooks.slack.com/test",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("fetch 실패해도 에러 안 나고 false 반환해요", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const svc = new SlackNotificationService("https://hooks.slack.com/test");
    const result = await svc.notify(event);
    expect(result).toBe(false);
  });

  it("fetch 200이 아닌 응답이면 false예요", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("error", { status: 500 }),
    );

    const svc = new SlackNotificationService("https://hooks.slack.com/test");
    const result = await svc.notify(event);
    expect(result).toBe(false);
  });
});
