/**
 * Sprint 236: F483 — EvaluationReportViewer 컴포넌트 테스트
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

// Mock api-client
const mockFetchHtml = vi.fn();
const mockShareReport = vi.fn();

vi.mock("@/lib/api-client", () => ({
  fetchEvaluationReportHtml: (...args: unknown[]) => mockFetchHtml(...args),
  shareEvaluationReport: (...args: unknown[]) => mockShareReport(...args),
  BASE_URL: "https://test-api.example.com/api",
}));

import EvaluationReportViewer from "../components/feature/discovery/EvaluationReportViewer";

describe("EvaluationReportViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("로딩 상태 표시", () => {
    mockFetchHtml.mockReturnValue(new Promise(() => {})); // never resolves
    const { getByText } = render(<EvaluationReportViewer bizItemId="item-001" />);
    expect(getByText("평가결과서 로딩 중...")).toBeDefined();
  });

  it("HTML 없을 때 empty 상태 표시", async () => {
    mockFetchHtml.mockRejectedValue(new Error("Not found"));
    const { getByText } = render(<EvaluationReportViewer bizItemId="item-001" />);

    await waitFor(() => {
      expect(getByText("등록된 평가결과서가 없어요")).toBeDefined();
    });
  });

  it("HTML 있을 때 iframe 렌더링", async () => {
    const sampleHtml = "<html><body><h1>KOAMI 평가결과서</h1></body></html>";
    mockFetchHtml.mockResolvedValue(sampleHtml);
    const { container } = render(<EvaluationReportViewer bizItemId="item-001" />);

    await waitFor(() => {
      const iframe = container.querySelector("iframe");
      expect(iframe).not.toBeNull();
      expect(iframe!.getAttribute("title")).toBe("발굴단계완료 평가결과서");
      expect(iframe!.getAttribute("sandbox")).toBe("allow-same-origin");
      expect(iframe!.getAttribute("srcdoc")).toBe(sampleHtml);
    });
  });

  it("새 창에서 보기 버튼 존재", async () => {
    mockFetchHtml.mockResolvedValue("<html></html>");
    const { getByText } = render(<EvaluationReportViewer bizItemId="item-001" />);

    await waitFor(() => {
      expect(getByText("새 창에서 보기")).toBeDefined();
    });
  });

  it("공유 링크 버튼 존재", async () => {
    mockFetchHtml.mockResolvedValue("<html></html>");
    const { getByText } = render(<EvaluationReportViewer bizItemId="item-001" />);

    await waitFor(() => {
      expect(getByText("공유 링크")).toBeDefined();
    });
  });
});
