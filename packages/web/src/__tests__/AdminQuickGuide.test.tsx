import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminQuickGuide from "../components/feature/AdminQuickGuide";
import MemberQuickStart from "../components/feature/MemberQuickStart";

describe("AdminQuickGuide (F252)", () => {
  it("renders 3 admin guide cards", () => {
    render(
      <MemoryRouter>
        <AdminQuickGuide />
      </MemoryRouter>,
    );
    expect(screen.getByText("팀 멤버 관리")).toBeInTheDocument();
    expect(screen.getByText("프로젝트 설정")).toBeInTheDocument();
    expect(screen.getByText("에이전트 구성")).toBeInTheDocument();
  });

  it("renders admin guide heading", () => {
    render(
      <MemoryRouter>
        <AdminQuickGuide />
      </MemoryRouter>,
    );
    expect(screen.getByText("관리자 퀵가이드")).toBeInTheDocument();
  });
});

describe("MemberQuickStart (F252)", () => {
  it("renders 3 member guide cards", () => {
    render(
      <MemoryRouter>
        <MemberQuickStart />
      </MemoryRouter>,
    );
    expect(screen.getByText("첫 SR 처리하기")).toBeInTheDocument();
    expect(screen.getByText("아이디어 등록하기")).toBeInTheDocument();
    expect(screen.getByText("내 프로필 설정")).toBeInTheDocument();
  });

  it("renders member guide heading", () => {
    render(
      <MemoryRouter>
        <MemberQuickStart />
      </MemoryRouter>,
    );
    expect(screen.getByText("시작하기")).toBeInTheDocument();
  });
});
