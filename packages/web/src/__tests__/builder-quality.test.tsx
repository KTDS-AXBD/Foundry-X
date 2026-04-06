import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Component as BuilderQuality } from "../routes/builder-quality";

// Mock API calls
vi.mock("@/lib/api-client", () => ({
  fetchQualityDashboardSummary: vi.fn().mockResolvedValue({
    totalPrototypes: 5,
    averageScore: 72.5,
    above80Count: 2,
    above80Pct: 40,
    totalCostSaved: 3.84,
    generationModes: { cli: 3, api: 2 },
  }),
  fetchQualityDimensions: vi.fn().mockResolvedValue({
    build: 0.85,
    ui: 0.6,
    functional: 0.72,
    prd: 0.55,
    code: 0.81,
  }),
  fetchQualityTrend: vi.fn().mockResolvedValue({
    points: [
      { date: "2026-04-01", avgScore: 65, count: 2 },
      { date: "2026-04-06", avgScore: 80, count: 3 },
    ],
    period: "30d",
  }),
  fetchCorrelation: vi.fn().mockResolvedValue({
    correlations: [
      { dimension: "build", pearson: 0.85, sampleSize: 3, autoMean: 0.8, manualMean: 0.75 },
    ],
    overallPearson: 0.82,
    totalEvaluations: 5,
    calibrationStatus: "good",
  }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <BuilderQuality />
    </MemoryRouter>,
  );
}

describe("BuilderQuality page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("대시보드 제목을 렌더링해요", async () => {
    renderPage();
    expect(await screen.findByText("Builder Quality Dashboard")).toBeTruthy();
  });

  it("스코어 카드에 평균 점수를 표시해요", async () => {
    renderPage();
    expect(await screen.findByText("72.5")).toBeTruthy();
  });

  it("상관관계 패널에 양호 배지를 표시해요", async () => {
    renderPage();
    expect(await screen.findByText("양호")).toBeTruthy();
  });
});
