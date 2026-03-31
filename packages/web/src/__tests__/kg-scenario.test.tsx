import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import KgScenarioPanel from "../components/feature/kg/KgScenarioPanel";
import type { ScenarioPreset, ScenarioResult } from "../lib/api-client";

const mockPresets: ScenarioPreset[] = [
  {
    id: "preset-petrochem-crisis",
    name: "석유화학 위기",
    nameEn: "Petrochemical Crisis",
    description: "중동 분쟁 + EU 탄소국경조정으로 석유화학 공급 체인 전반에 연쇄 영향",
    eventNodeIds: ["e-mideast", "e-eu-cbam"],
    category: "petrochemical",
  },
  {
    id: "preset-semi-shortage",
    name: "반도체 공급난",
    nameEn: "Semiconductor Shortage",
    description: "일본 수출 규제 + 대만 지진으로 반도체 소재→패키징 체인 동시 차질",
    eventNodeIds: ["e-japan-export", "e-taiwan-eq"],
    category: "semiconductor",
  },
  {
    id: "preset-compound-crisis",
    name: "복합 위기",
    nameEn: "Compound Crisis",
    description: "중동 분쟁 + 일본 수출 규제 + 미중 반도체 규제 동시 발생 시 교차 영향",
    eventNodeIds: ["e-mideast", "e-japan-export", "e-us-china-semi"],
    category: "compound",
  },
];

const mockResult: ScenarioResult = {
  events: [
    { id: "e-mideast", name: "중동 분쟁" },
    { id: "e-eu-cbam", name: "EU 탄소국경조정" },
  ],
  affectedNodes: [
    {
      id: "p-crude-oil",
      type: "PRODUCT",
      name: "원유",
      nameEn: "Crude Oil",
      combinedScore: 0.95,
      impactLevel: "HIGH",
      eventContributions: [{ eventId: "e-mideast", eventName: "중동 분쟁", score: 0.95 }],
      eventCount: 1,
      isHotspot: false,
    },
    {
      id: "p-pe",
      type: "PRODUCT",
      name: "폴리에틸렌(PE)",
      combinedScore: 0.85,
      impactLevel: "HIGH",
      eventContributions: [
        { eventId: "e-mideast", eventName: "중동 분쟁", score: 0.45 },
        { eventId: "e-eu-cbam", eventName: "EU 탄소국경조정", score: 0.5 },
      ],
      eventCount: 2,
      isHotspot: true,
    },
    {
      id: "p-naphtha",
      type: "PRODUCT",
      name: "나프타",
      combinedScore: 0.25,
      impactLevel: "LOW",
      eventContributions: [{ eventId: "e-mideast", eventName: "중동 분쟁", score: 0.25 }],
      eventCount: 1,
      isHotspot: false,
    },
  ],
  hotspots: [
    {
      id: "p-pe",
      type: "PRODUCT",
      name: "폴리에틸렌(PE)",
      combinedScore: 0.85,
      impactLevel: "HIGH",
      eventContributions: [
        { eventId: "e-mideast", eventName: "중동 분쟁", score: 0.45 },
        { eventId: "e-eu-cbam", eventName: "EU 탄소국경조정", score: 0.5 },
      ],
      eventCount: 2,
      isHotspot: true,
    },
  ],
  totalAffected: 3,
  hotspotCount: 1,
  byLevel: { high: 2, medium: 0, low: 1 },
};

// Mock api-client — vi.mock is hoisted, so cannot reference outer variables
const mockGetPresets = vi.fn();
const mockSimulate = vi.fn();

vi.mock("../lib/api-client", async () => {
  const actual = await vi.importActual("../lib/api-client");
  return {
    ...actual,
    getScenarioPresets: (...args: unknown[]) => mockGetPresets(...args),
    simulateScenario: (...args: unknown[]) => mockSimulate(...args),
  };
});

describe("KgScenarioPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPresets.mockResolvedValue({ presets: mockPresets });
    mockSimulate.mockResolvedValue(mockResult);
  });

  it("renders 3 preset cards", async () => {
    render(<KgScenarioPanel />);
    await waitFor(() => {
      expect(screen.getByText("석유화학 위기")).toBeDefined();
    });
    expect(screen.getByText("반도체 공급난")).toBeDefined();
    expect(screen.getByText("복합 위기")).toBeDefined();
  });

  it("clicking preset triggers simulation", async () => {
    render(<KgScenarioPanel />);
    await waitFor(() => {
      expect(screen.getByText("석유화학 위기")).toBeDefined();
    });
    fireEvent.click(screen.getByText("석유화학 위기"));
    await waitFor(() => {
      expect(mockSimulate).toHaveBeenCalledWith({
        eventNodeIds: ["e-mideast", "e-eu-cbam"],
      });
    });
  });

  it("shows simulation results after clicking preset", async () => {
    render(<KgScenarioPanel />);
    await waitFor(() => {
      expect(screen.getByText("석유화학 위기")).toBeDefined();
    });
    fireEvent.click(screen.getByText("석유화학 위기"));
    await waitFor(() => {
      expect(screen.getByText(/전체 3/)).toBeDefined();
    });
  });

  it("highlights hotspot nodes", async () => {
    render(<KgScenarioPanel />);
    await waitFor(() => {
      expect(screen.getByText("석유화학 위기")).toBeDefined();
    });
    fireEvent.click(screen.getByText("석유화학 위기"));
    await waitFor(() => {
      // Hotspot badge should be visible
      expect(screen.getAllByText("핫스팟").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows event contributions", async () => {
    render(<KgScenarioPanel />);
    await waitFor(() => {
      expect(screen.getByText("석유화학 위기")).toBeDefined();
    });
    fireEvent.click(screen.getByText("석유화학 위기"));
    await waitFor(() => {
      // Event names in contributions
      expect(screen.getAllByText(/중동 분쟁/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows summary bar with level counts", async () => {
    render(<KgScenarioPanel />);
    await waitFor(() => {
      expect(screen.getByText("석유화학 위기")).toBeDefined();
    });
    fireEvent.click(screen.getByText("석유화학 위기"));
    await waitFor(() => {
      expect(screen.getByText(/H:2/)).toBeDefined();
      expect(screen.getByText(/L:1/)).toBeDefined();
    });
  });

  it("shows empty state when no preset is selected", async () => {
    render(<KgScenarioPanel />);
    await waitFor(() => {
      expect(screen.getByText("석유화학 위기")).toBeDefined();
    });
    expect(screen.getByText(/프리셋 중 하나를 선택/)).toBeDefined();
  });

  it("shows preset descriptions", async () => {
    render(<KgScenarioPanel />);
    await waitFor(() => {
      expect(screen.getByText(/중동 분쟁 \+ EU 탄소국경조정/)).toBeDefined();
      expect(screen.getByText(/일본 수출 규제 \+ 대만 지진/)).toBeDefined();
    });
  });
});
