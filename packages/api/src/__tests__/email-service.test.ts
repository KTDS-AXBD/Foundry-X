import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmailService } from "../modules/auth/services/email-service.js";

describe("EmailService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("without API key (log-only)", () => {
    it("returns success with log-only messageId", async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const svc = new EmailService();
      const result = await svc.send({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Hello</p>",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("log-only");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[EMAIL_LOG]")
      );
    });
  });

  describe("with API key", () => {
    it("calls Resend API on success", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "msg_123" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const svc = new EmailService("re_test_key");
      const result = await svc.send({
        to: "user@example.com",
        subject: "Reset",
        html: "<p>Reset your password</p>",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg_123");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer re_test_key",
          }),
        }),
      );
    });

    it("returns failure on API error", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Bad request" }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const svc = new EmailService("re_bad_key");
      const result = await svc.send({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
    });
  });
});
