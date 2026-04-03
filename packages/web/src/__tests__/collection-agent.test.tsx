import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("CollectionAgent page (F291)", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("renders page with title", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ runs: [], total: 0 }),
    });

    const { Component } = await import("@/routes/collection-agent");
    const { getByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getByText("Agent 수집")).toBeDefined();
    });
  });

  it("renders trigger buttons", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ runs: [], total: 0 }),
    });

    const { Component } = await import("@/routes/collection-agent");
    const { getByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getByText("시장 수집")).toBeDefined();
      expect(getByText("뉴스 수집")).toBeDefined();
      expect(getByText("기술 수집")).toBeDefined();
    });
  });

  it("shows empty state when no runs", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ runs: [], total: 0 }),
    });

    const { Component } = await import("@/routes/collection-agent");
    const { getByText } = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(getByText("아직 수집 이력이 없어요")).toBeDefined();
    });
  });
});
