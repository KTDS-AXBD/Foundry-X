import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchApi, ApiError } from "../lib/api-client";

describe("api-client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ─── ApiError ───

  describe("ApiError", () => {
    it("stores status and message", () => {
      const err = new ApiError(404, "Not Found");
      expect(err.status).toBe(404);
      expect(err.message).toBe("Not Found");
      expect(err.name).toBe("ApiError");
    });

    it("is instanceof Error", () => {
      const err = new ApiError(500, "Server Error");
      expect(err).toBeInstanceOf(Error);
    });
  });

  // ─── fetchApi ───

  describe("fetchApi", () => {
    it("fetches and returns JSON for valid response", async () => {
      const mockData = { overall: 82, grade: "B" };
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      } as Response);

      const result = await fetchApi<typeof mockData>("/health");
      expect(result).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith("/api/health");
    });

    it("normalizes path without leading slash", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      await fetchApi("agents");
      expect(fetch).toHaveBeenCalledWith("/api/agents");
    });

    it("throws ApiError for non-ok response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response);

      await expect(fetchApi("/missing")).rejects.toThrow(ApiError);
      await expect(fetchApi("/missing")).rejects.toThrow("API 404");
    });

    it("thrown error has correct status", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      } as Response);

      try {
        await fetchApi("/fail");
        expect.unreachable("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).status).toBe(500);
      }
    });
  });
});
