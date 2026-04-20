// C84: api-client 401 UX TDD Red phase
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// vi.mock is hoisted — auto-mock handles circular dep (api-client ↔ auth-store)
vi.mock("../lib/stores/auth-store");

import { fetchApi, ApiError } from "../lib/api-client";
import { refreshAccessToken } from "../lib/stores/auth-store";

describe("api-client — 401 UX (C84)", () => {
  let locationAssign: ReturnType<typeof vi.fn>;
  let dispatchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(refreshAccessToken).mockResolvedValue(false);

    // Stub location (avoid jsdom navigation + capture assign calls)
    locationAssign = vi.fn();
    vi.stubGlobal("location", { pathname: "/dashboard", assign: locationAssign });

    // Stub dispatchEvent — avoids vi.spyOn overload type conflict
    dispatchMock = vi.fn();
    vi.stubGlobal("dispatchEvent", dispatchMock);

    // Storage.prototype spy works across both localStorage and sessionStorage
    vi.spyOn(Storage.prototype, "setItem");
    vi.spyOn(Storage.prototype, "removeItem");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  function mock401() {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    } as Response);
  }

  function mockStatus(status: number, statusText: string) {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status,
      statusText,
    } as Response);
  }

  // ── 401 behavior ──────────────────────────────────────────────

  it("401: stores postLoginRedirect in sessionStorage", async () => {
    mock401();
    await expect(fetchApi("/protected")).rejects.toThrow(ApiError);
    expect(Storage.prototype.setItem).toHaveBeenCalledWith("postLoginRedirect", "/dashboard");
  });

  it("401: dispatches app:toast CustomEvent", async () => {
    mock401();
    await expect(fetchApi("/protected")).rejects.toThrow(ApiError);
    expect(dispatchMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "app:toast" }),
    );
  });

  it("401: clears token, refreshToken, user from localStorage", async () => {
    mock401();
    await expect(fetchApi("/protected")).rejects.toThrow(ApiError);
    expect(Storage.prototype.removeItem).toHaveBeenCalledWith("token");
    expect(Storage.prototype.removeItem).toHaveBeenCalledWith("refreshToken");
    expect(Storage.prototype.removeItem).toHaveBeenCalledWith("user");
  });

  it("401: does NOT immediately redirect (delayed)", async () => {
    mock401();
    await expect(fetchApi("/protected")).rejects.toThrow(ApiError);
    expect(locationAssign).not.toHaveBeenCalled();
  });

  it("401: redirects to /login after delay", async () => {
    mock401();
    await expect(fetchApi("/protected")).rejects.toThrow(ApiError);
    vi.runAllTimers();
    expect(locationAssign).toHaveBeenCalledWith("/login");
  });

  it("401: throws ApiError with status 401", async () => {
    mock401();
    const err = await fetchApi("/protected").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
  });

  // ── 404 / 403 — no redirect, no sessionStorage ────────────────

  it("404: throws ApiError without redirect or sessionStorage write", async () => {
    mockStatus(404, "Not Found");
    await expect(fetchApi("/missing")).rejects.toBeInstanceOf(ApiError);
    expect(Storage.prototype.setItem).not.toHaveBeenCalledWith(
      "postLoginRedirect",
      expect.any(String),
    );
    vi.runAllTimers();
    expect(locationAssign).not.toHaveBeenCalled();
  });

  it("403: throws ApiError without redirect or sessionStorage write", async () => {
    mockStatus(403, "Forbidden");
    await expect(fetchApi("/forbidden")).rejects.toBeInstanceOf(ApiError);
    expect(Storage.prototype.setItem).not.toHaveBeenCalledWith(
      "postLoginRedirect",
      expect.any(String),
    );
    vi.runAllTimers();
    expect(locationAssign).not.toHaveBeenCalled();
  });
});
