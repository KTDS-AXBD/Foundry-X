import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MethodologyListPanel from "../components/feature/MethodologyListPanel";
import MethodologyDetailPanel from "../components/feature/MethodologyDetailPanel";
import MethodologyProgressDash from "../components/feature/MethodologyProgressDash";
import MethodologySelector from "../components/feature/MethodologySelector";

// Mock api-client
vi.mock("../lib/api-client", () => ({
  getMethodologies: vi.fn(),
  getMethodologyDetail: vi.fn(),
  getMethodologyRecommendation: vi.fn(),
}));

import { getMethodologies, getMethodologyDetail, getMethodologyRecommendation } from "../lib/api-client";

const mockMethodologies = [
  { id: "bdp", name: "BDP 6단계", description: "AX Discovery Process", version: "1.0.0", isDefault: true },
  { id: "pm-skills", name: "PM Skills 기반 분석", description: "10개 PM 스킬 순차 실행", version: "1.0.0", isDefault: false },
];

const mockDetail = {
  id: "pm-skills",
  name: "PM Skills 기반 분석",
  description: "10개 PM 스킬을 순차 실행",
  version: "1.0.0",
  criteria: [
    { id: 1, name: "고객 인사이트", condition: "인터뷰 결과 1건+", skills: ["/interview"], outputType: "interview_result", isRequired: true },
    { id: 6, name: "리스크 식별 완전성", condition: "핵심 리스크 5개+", skills: ["/pre-mortem"], outputType: "risk_assessment", isRequired: false },
  ],
  reviewMethods: [
    { id: "cross-validation", name: "스킬 산출물 교차 검증", description: "논리적 일관성 검토", type: "cross_validation" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MethodologyListPanel", () => {
  it("renders methodology list after loading", async () => {
    vi.mocked(getMethodologies).mockResolvedValue({ methodologies: mockMethodologies });
    const onSelect = vi.fn();

    render(<MethodologyListPanel onSelect={onSelect} selectedId={null} />);

    await waitFor(() => {
      expect(screen.getByText("BDP 6단계")).toBeInTheDocument();
      expect(screen.getByText("PM Skills 기반 분석")).toBeInTheDocument();
    });
  });

  it("calls onSelect when a methodology card is clicked", async () => {
    vi.mocked(getMethodologies).mockResolvedValue({ methodologies: mockMethodologies });
    const onSelect = vi.fn();

    render(<MethodologyListPanel onSelect={onSelect} selectedId={null} />);

    await waitFor(() => {
      expect(screen.getByText("BDP 6단계")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("BDP 6단계"));
    expect(onSelect).toHaveBeenCalledWith("bdp");
  });
});

describe("MethodologyDetailPanel", () => {
  it("renders criteria list with required badge", async () => {
    vi.mocked(getMethodologyDetail).mockResolvedValue(mockDetail);

    render(<MethodologyDetailPanel methodologyId="pm-skills" />);

    await waitFor(() => {
      expect(screen.getByText("고객 인사이트")).toBeInTheDocument();
      expect(screen.getByText("필수")).toBeInTheDocument();
    });
  });

  it("renders review methods section", async () => {
    vi.mocked(getMethodologyDetail).mockResolvedValue(mockDetail);

    render(<MethodologyDetailPanel methodologyId="pm-skills" />);

    await waitFor(() => {
      expect(screen.getByText("스킬 산출물 교차 검증")).toBeInTheDocument();
    });
  });
});

describe("MethodologyProgressDash", () => {
  it("shows empty message when no items", () => {
    render(<MethodologyProgressDash items={[]} />);
    expect(screen.getByText("아직 방법론이 적용된 아이템이 없어요.")).toBeInTheDocument();
  });

  it("groups items by methodology and shows progress", () => {
    const items = [
      { bizItemId: "1", title: "아이템 A", methodologyId: "pm-skills", gateStatus: "ready" as const, completedCount: 10, totalCount: 12 },
      { bizItemId: "2", title: "아이템 B", methodologyId: "pm-skills", gateStatus: "blocked" as const, completedCount: 3, totalCount: 12 },
    ];

    render(<MethodologyProgressDash items={items} />);
    expect(screen.getByText("아이템 A")).toBeInTheDocument();
    expect(screen.getByText("아이템 B")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });
});

describe("MethodologySelector", () => {
  it("renders dropdown with methodologies", async () => {
    vi.mocked(getMethodologies).mockResolvedValue({ methodologies: mockMethodologies });
    vi.mocked(getMethodologyRecommendation).mockResolvedValue({ recommendations: [{ id: "pm-skills", name: "PM Skills", score: 72 }] });

    render(<MethodologySelector bizItemId="test-item" currentMethodologyId={null} onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("BDP 6단계")).toBeInTheDocument();
    });
  });

  it("shows recommendation hint", async () => {
    vi.mocked(getMethodologies).mockResolvedValue({ methodologies: mockMethodologies });
    vi.mocked(getMethodologyRecommendation).mockResolvedValue({ recommendations: [{ id: "pm-skills", name: "PM Skills", score: 72 }] });

    render(<MethodologySelector bizItemId="test-item" currentMethodologyId={null} onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/추천: PM Skills/)).toBeInTheDocument();
    });
  });

  it("shows confirm dialog on methodology change", async () => {
    vi.mocked(getMethodologies).mockResolvedValue({ methodologies: mockMethodologies });
    vi.mocked(getMethodologyRecommendation).mockResolvedValue({ recommendations: [] });
    const onSelect = vi.fn();

    render(<MethodologySelector bizItemId="test-item" currentMethodologyId="bdp" onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByText("BDP 6단계")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "pm-skills" } });
    expect(screen.getByText(/변경 시 기존 분석 결과는 유지/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("변경"));
    expect(onSelect).toHaveBeenCalledWith("pm-skills");
  });
});
