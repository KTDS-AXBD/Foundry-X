import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PipelineMonitorDashboard } from "../components/feature/discovery/PipelineMonitorDashboard";
import { PipelinePermissionEditor } from "../components/feature/discovery/PipelinePermissionEditor";
import { CheckpointApproverInfo } from "../components/feature/discovery/CheckpointApproverInfo";

// Mock api-client
vi.mock("@/lib/api-client", () => ({
  fetchApi: vi.fn(),
  putApi: vi.fn(),
}));

const { fetchApi } = await import("@/lib/api-client");
const mockFetchApi = vi.mocked(fetchApi);

describe("PipelineMonitorDashboard (F315)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders status cards and run list", async () => {
    mockFetchApi.mockResolvedValueOnce({
      summary: {
        discovery_running: 2,
        failed: 1,
        paused: 1,
        shaping_complete: 3,
      },
      pendingCheckpoints: 1,
      runs: [
        {
          id: "run-1",
          status: "discovery_running",
          currentStep: "2-3",
          bizItemTitle: "헬스케어 AI",
          createdAt: "2026-04-05T00:00:00Z",
        },
      ],
      total: 7,
    });

    render(<PipelineMonitorDashboard />);

    // Wait for async load
    await vi.waitFor(() => {
      expect(screen.getByText("헬스케어 AI")).toBeDefined();
    });

    // Status cards
    expect(screen.getByText("발굴 중")).toBeDefined();
    expect(screen.getByText("실패")).toBeDefined();

    // Pending checkpoint banner
    expect(screen.getByText("1건")).toBeDefined();
  });

  it("renders empty state", async () => {
    mockFetchApi.mockResolvedValueOnce({
      summary: {},
      pendingCheckpoints: 0,
      runs: [],
      total: 0,
    });

    render(<PipelineMonitorDashboard />);

    await vi.waitFor(() => {
      expect(screen.getByText("파이프라인 실행 이력이 없어요")).toBeDefined();
    });
  });
});

describe("PipelinePermissionEditor (F315)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders default message when no permissions", async () => {
    mockFetchApi.mockResolvedValueOnce({ permissions: [] });

    render(<PipelinePermissionEditor runId="run-1" isAdmin={true} />);

    await vi.waitFor(() => {
      expect(screen.getByText(/기본 정책/)).toBeDefined();
    });
  });

  it("hides add button for non-admin", async () => {
    mockFetchApi.mockResolvedValueOnce({ permissions: [] });

    render(<PipelinePermissionEditor runId="run-1" isAdmin={false} />);

    await vi.waitFor(() => {
      expect(screen.queryByText("추가")).toBeNull();
    });
  });
});

describe("CheckpointApproverInfo (F315)", () => {
  it("renders pending state with deadline", () => {
    const futureDate = new Date(Date.now() + 12 * 3600000).toISOString();

    render(
      <CheckpointApproverInfo
        checkpoint={{
          status: "pending",
          decidedBy: null,
          decidedAt: null,
          deadline: futureDate,
        }}
      />,
    );

    expect(screen.getByText("승인 대기 중")).toBeDefined();
    expect(screen.getByText(/시간 남음/)).toBeDefined();
  });

  it("renders approved state with approver info", () => {
    render(
      <CheckpointApproverInfo
        checkpoint={{
          status: "approved",
          decidedBy: "user-abc-1234-5678",
          decidedAt: "2026-04-05T10:00:00Z",
          deadline: null,
        }}
      />,
    );

    expect(screen.getByText("승인됨")).toBeDefined();
    expect(screen.getByText(/user-abc/)).toBeDefined();
  });

  it("shows no permission message when canApprove is false", () => {
    render(
      <CheckpointApproverInfo
        checkpoint={{
          status: "pending",
          decidedBy: null,
          decidedAt: null,
          deadline: null,
        }}
        canApprove={false}
      />,
    );

    expect(screen.getByText(/승인 권한이 없어요/)).toBeDefined();
  });
});
