import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CoworkSetupGuide from "../components/feature/CoworkSetupGuide";
import SkillReferenceTable from "../components/feature/SkillReferenceTable";
import ProcessLifecycleFlow from "../components/feature/ProcessLifecycleFlow";
import TeamFaqSection from "../components/feature/TeamFaqSection";
import type { SkillGuideResponse, ProcessFlowResponse, TeamFaqResponse } from "../lib/api-client";

// ─── Fixtures ───

const skillGuideData: SkillGuideResponse = {
  orchestrator: {
    name: "ax-bd-discovery",
    description: "AX BD Discovery 오케스트레이터",
    commands: [
      { command: "/ax-bd-discovery start", description: "Discovery 시작" },
      { command: "/ax-bd-discovery status", description: "현황 조회" },
    ],
    stages: [
      { id: "2-0", name: "분류", description: "유형 분류" },
      { id: "2-1", name: "시장조사", description: "시장 조사" },
      { id: "2-5", name: "Commit Gate", description: "투자 결정" },
    ],
  },
  skills: [
    {
      name: "market-analysis",
      displayName: "시장 분석",
      description: "시장 규모와 트렌드를 분석해요",
      category: "분석",
      triggers: ["/market-analysis"],
      frameworks: ["TAM-SAM-SOM"],
    },
    {
      name: "strategy-canvas",
      displayName: "전략 캔버스",
      description: "전략적 포지셔닝을 시각화해요",
      category: "전략",
      triggers: ["/strategy-canvas"],
      frameworks: ["Blue Ocean"],
    },
    {
      name: "compliance-check",
      displayName: "규제 검토",
      description: "규제 이슈를 검토해요",
      category: "규제",
      triggers: ["/compliance"],
      frameworks: [],
    },
  ],
};

const processFlowData: ProcessFlowResponse = {
  lifecycle: [
    { stage: 1, name: "수집", description: "데이터 수집", tools: [] },
    { stage: 2, name: "발굴", description: "사업 기회 발굴", tools: [] },
    { stage: 3, name: "형상화", description: "구체화", tools: [] },
    { stage: 4, name: "검증", description: "사업성 검증", tools: [] },
    { stage: 5, name: "제품화", description: "제품 개발", tools: [] },
    { stage: 6, name: "GTM", description: "시장 진출", tools: [] },
  ],
  discovery: {
    types: [
      { code: "I", name: "혁신형", description: "신규 혁신 아이디어", icon: "💡" },
      { code: "M", name: "시장형", description: "시장 기회 기반", icon: "📊" },
      { code: "P", name: "문제형", description: "문제 해결 기반", icon: "🏗️" },
      { code: "T", name: "기술형", description: "기술 기반", icon: "🔬" },
      { code: "S", name: "전략형", description: "전략적 제휴", icon: "🤝" },
    ],
    stages: [
      { id: "2-1", name: "시장조사", coreFor: ["M"], normalFor: ["I"], lightFor: ["T"] },
    ],
    commitGate: {
      stage: "2-5",
      questions: [
        "투자 가치가 있는가?",
        "팀 역량과 부합하는가?",
        "방향 전환이 필요한가?",
        "잃는 것 대비 얻는 것은?",
      ],
    },
  },
};

const teamFaqData: TeamFaqResponse = {
  categories: ["일반", "AX BD", "트러블슈팅"],
  items: [
    { id: "tf-1", category: "일반", question: "스킬 설치 방법은?", answer: "cowork plugin install 명령 사용" },
    { id: "tf-2", category: "AX BD", question: "Discovery 시작 방법은?", answer: "/ax-bd-discovery start 명령 사용" },
    { id: "tf-3", category: "트러블슈팅", question: "플러그인 오류 해결?", answer: "캐시 삭제 후 재설치" },
  ],
};

// ─── CoworkSetupGuide ───

describe("CoworkSetupGuide", () => {
  it("renders step cards", () => {
    render(<CoworkSetupGuide />);
    expect(screen.getByText("환경 확인")).toBeInTheDocument();
    expect(screen.getByText("플러그인 설치")).toBeInTheDocument();
    expect(screen.getByText("설정 확인")).toBeInTheDocument();
    expect(screen.getByText("첫 실행")).toBeInTheDocument();
  });

  it("defaults to Cowork environment", () => {
    render(<CoworkSetupGuide />);
    expect(screen.getByText("cowork plugin install pm-skills ai-biz")).toBeInTheDocument();
  });

  it("toggles to Claude Code environment", () => {
    render(<CoworkSetupGuide />);
    fireEvent.click(screen.getByText("Claude Code"));
    expect(screen.getByText(/\.claude\/skills\/ 디렉토리에 스킬 복사/)).toBeInTheDocument();
  });
});

// ─── SkillReferenceTable ───

describe("SkillReferenceTable", () => {
  it("renders loading state when data is null", () => {
    render(<SkillReferenceTable data={null} />);
    expect(screen.getByText("스킬 데이터를 불러오는 중...")).toBeInTheDocument();
  });

  it("renders skills grid", () => {
    render(<SkillReferenceTable data={skillGuideData} />);
    expect(screen.getByText("시장 분석")).toBeInTheDocument();
    expect(screen.getByText("전략 캔버스")).toBeInTheDocument();
    expect(screen.getByText("규제 검토")).toBeInTheDocument();
  });

  it("filters by category", () => {
    render(<SkillReferenceTable data={skillGuideData} />);
    // Use getAllByText since "분석" appears in both button and badge
    const buttons = screen.getAllByText("분석");
    // Click the category filter button (first match)
    fireEvent.click(buttons[0]);
    expect(screen.getByText("시장 분석")).toBeInTheDocument();
    expect(screen.queryByText("전략 캔버스")).not.toBeInTheDocument();
  });

  it("searches by text", () => {
    render(<SkillReferenceTable data={skillGuideData} />);
    const input = screen.getByPlaceholderText("스킬 이름, 설명, 트리거로 검색...");
    fireEvent.change(input, { target: { value: "규제" } });
    expect(screen.getByText("규제 검토")).toBeInTheDocument();
    expect(screen.queryByText("시장 분석")).not.toBeInTheDocument();
  });

  it("renders orchestrator section", () => {
    render(<SkillReferenceTable data={skillGuideData} />);
    expect(screen.getByText("ax-bd-discovery")).toBeInTheDocument();
    expect(screen.getByText("/ax-bd-discovery start")).toBeInTheDocument();
  });
});

// ─── ProcessLifecycleFlow ───

describe("ProcessLifecycleFlow", () => {
  it("renders loading state when data is null", () => {
    render(<ProcessLifecycleFlow data={null} />);
    expect(screen.getByText("프로세스 데이터를 불러오는 중...")).toBeInTheDocument();
  });

  it("renders lifecycle stages", () => {
    render(<ProcessLifecycleFlow data={processFlowData} />);
    expect(screen.getByText("수집")).toBeInTheDocument();
    expect(screen.getByText("발굴")).toBeInTheDocument();
    expect(screen.getByText("형상화")).toBeInTheDocument();
    expect(screen.getByText("검증")).toBeInTheDocument();
    expect(screen.getByText("제품화")).toBeInTheDocument();
    expect(screen.getByText("GTM")).toBeInTheDocument();
  });

  it("expands discovery detail on click", () => {
    render(<ProcessLifecycleFlow data={processFlowData} />);
    // Discovery detail should not be visible initially
    expect(screen.queryByText("5유형 분류")).not.toBeInTheDocument();

    // Click 발굴 stage
    fireEvent.click(screen.getByText("발굴"));

    // Now discovery detail should be visible
    expect(screen.getByText("5유형 분류")).toBeInTheDocument();
    expect(screen.getByText("I — 혁신형")).toBeInTheDocument();
    expect(screen.getByText("Commit Gate")).toBeInTheDocument();
    expect(screen.getByText("투자 가치가 있는가?")).toBeInTheDocument();
  });

  it("collapses discovery detail on second click", () => {
    render(<ProcessLifecycleFlow data={processFlowData} />);
    fireEvent.click(screen.getByText("발굴"));
    expect(screen.getByText("5유형 분류")).toBeInTheDocument();

    fireEvent.click(screen.getByText("발굴"));
    expect(screen.queryByText("5유형 분류")).not.toBeInTheDocument();
  });
});

// ─── TeamFaqSection ───

describe("TeamFaqSection", () => {
  it("renders loading state when data is null", () => {
    render(<TeamFaqSection data={null} />);
    expect(screen.getByText("FAQ 데이터를 불러오는 중...")).toBeInTheDocument();
  });

  it("renders FAQ items", () => {
    render(<TeamFaqSection data={teamFaqData} />);
    expect(screen.getByText("스킬 설치 방법은?")).toBeInTheDocument();
    expect(screen.getByText("Discovery 시작 방법은?")).toBeInTheDocument();
    expect(screen.getByText("플러그인 오류 해결?")).toBeInTheDocument();
  });

  it("filters by category", () => {
    render(<TeamFaqSection data={teamFaqData} />);
    fireEvent.click(screen.getByText("AX BD"));
    expect(screen.getByText("Discovery 시작 방법은?")).toBeInTheDocument();
    expect(screen.queryByText("스킬 설치 방법은?")).not.toBeInTheDocument();
  });

  it("searches FAQ items", () => {
    render(<TeamFaqSection data={teamFaqData} />);
    const input = screen.getByPlaceholderText("질문 또는 답변 검색...");
    fireEvent.change(input, { target: { value: "플러그인" } });
    expect(screen.getByText("플러그인 오류 해결?")).toBeInTheDocument();
    expect(screen.queryByText("Discovery 시작 방법은?")).not.toBeInTheDocument();
  });

  it("shows empty state when no results", () => {
    render(<TeamFaqSection data={teamFaqData} />);
    const input = screen.getByPlaceholderText("질문 또는 답변 검색...");
    fireEvent.change(input, { target: { value: "존재하지않는검색어" } });
    expect(screen.getByText("검색 결과가 없어요.")).toBeInTheDocument();
  });
});
