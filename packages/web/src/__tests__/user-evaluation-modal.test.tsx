import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UserEvaluationModal from "../components/feature/builder/UserEvaluationModal";

describe("UserEvaluationModal", () => {
  const mockSubmit = vi.fn().mockResolvedValue(undefined);
  const mockClose = vi.fn();

  it("5차원 평가 폼을 렌더링해요", () => {
    render(
      <UserEvaluationModal jobId="job-1" onSubmit={mockSubmit} onClose={mockClose} />,
    );

    expect(screen.getByText("프로토타입 수동 평가")).toBeTruthy();
    expect(screen.getByText("Build 품질")).toBeTruthy();
    expect(screen.getByText("UI 품질")).toBeTruthy();
    expect(screen.getByText("기능 품질")).toBeTruthy();
    expect(screen.getByText("PRD 반영도")).toBeTruthy();
    expect(screen.getByText("코드 품질")).toBeTruthy();
    expect(screen.getByText("전체 평가")).toBeTruthy();
  });

  it("취소 버튼으로 모달을 닫아요", () => {
    render(
      <UserEvaluationModal jobId="job-1" onSubmit={mockSubmit} onClose={mockClose} />,
    );

    fireEvent.click(screen.getByText("취소"));
    expect(mockClose).toHaveBeenCalled();
  });
});
