import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WidgetRenderer } from "../components/feature/WidgetRenderer";
import { SectionRenderer } from "../components/feature/SectionRenderer";
import { DynamicRenderer } from "../components/feature/DynamicRenderer";
import { AgentTaskResult } from "../components/feature/AgentTaskResult";
import type { UIHint, UISection, AgentExecutionResult } from "@/lib/api-client";

// ─── WidgetRenderer (3건) ───

describe("WidgetRenderer", () => {
  it("iframe srcDoc contains html props content", () => {
    const { container } = render(
      <WidgetRenderer title="Test Widget" html="<h1>Hello World</h1>" />,
    );
    const iframe = container.querySelector("iframe");
    expect(iframe).toBeTruthy();
    expect(iframe!.getAttribute("srcdoc")).toContain("<h1>Hello World</h1>");
  });

  it("iframe sandbox is allow-scripts only (no allow-same-origin)", () => {
    const { container } = render(
      <WidgetRenderer title="Secure Widget" html="<p>Safe</p>" />,
    );
    const iframe = container.querySelector("iframe");
    expect(iframe!.getAttribute("sandbox")).toBe("allow-scripts");
    expect(iframe!.getAttribute("sandbox")).not.toContain("allow-same-origin");
  });

  it("displays title in header", () => {
    render(<WidgetRenderer title="My Custom Widget" html="<p>Body</p>" />);
    expect(screen.getByText("My Custom Widget")).toBeInTheDocument();
  });
});

// ─── SectionRenderer (4건) ───

describe("SectionRenderer", () => {
  it("type=text renders data in pre tag", () => {
    const section: UISection = {
      type: "text",
      title: "Summary",
      data: "Analysis complete",
    };
    const { container } = render(<SectionRenderer section={section} />);
    expect(screen.getByText("Summary")).toBeInTheDocument();
    const pre = container.querySelector("pre");
    expect(pre).toBeTruthy();
    expect(pre!.textContent).toBe("Analysis complete");
  });

  it("type=code applies bg-zinc-900 style", () => {
    const section: UISection = {
      type: "code",
      title: "Generated Code",
      data: "const x = 1;",
    };
    const { container } = render(<SectionRenderer section={section} />);
    const pre = container.querySelector("pre");
    expect(pre).toBeTruthy();
    expect(pre!.className).toContain("bg-zinc-900");
  });

  it("type=table renders headers and rows as table", () => {
    const section: UISection = {
      type: "table",
      title: "Results",
      data: {
        headers: ["Name", "Score"],
        rows: [
          ["Alpha", "95"],
          ["Beta", "87"],
        ],
      },
    };
    const { container } = render(<SectionRenderer section={section} />);
    expect(screen.getByText("Results")).toBeInTheDocument();

    const table = container.querySelector("table");
    expect(table).toBeTruthy();

    // Check headers
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Score")).toBeInTheDocument();

    // Check rows
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("95")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("87")).toBeInTheDocument();
  });

  it("unknown type falls back to JSON.stringify", () => {
    const section: UISection = {
      type: "unknown-type" as UISection["type"],
      title: "Exotic",
      data: { key: "value" },
    };
    render(<SectionRenderer section={section} />);
    expect(screen.getByText(/Exotic/)).toBeInTheDocument();
    expect(screen.getByText(/unknown-type/)).toBeInTheDocument();
    // JSON.stringify output should be present
    expect(screen.getByText(/"key": "value"/)).toBeInTheDocument();
  });
});

// ─── DynamicRenderer (2건) ───

describe("DynamicRenderer", () => {
  it("layout=iframe with html renders WidgetRenderer (iframe exists)", () => {
    const uiHint: UIHint = {
      layout: "iframe",
      sections: [{ type: "text", title: "Chart", data: "description" }],
      html: "<div>Custom Chart</div>",
    };
    const { container } = render(<DynamicRenderer uiHint={uiHint} />);
    const iframe = container.querySelector("iframe");
    expect(iframe).toBeTruthy();
    expect(iframe!.getAttribute("srcdoc")).toContain("<div>Custom Chart</div>");
  });

  it("layout=card renders sections sequentially", () => {
    const uiHint: UIHint = {
      layout: "card",
      sections: [
        { type: "text", title: "Section A", data: "Data A" },
        { type: "text", title: "Section B", data: "Data B" },
      ],
    };
    render(<DynamicRenderer uiHint={uiHint} />);
    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Section B")).toBeInTheDocument();
    expect(screen.getByText("Data A")).toBeInTheDocument();
    expect(screen.getByText("Data B")).toBeInTheDocument();
  });
});

// ─── AgentTaskResult (2건) ───

describe("AgentTaskResult", () => {
  const baseResult: AgentExecutionResult = {
    status: "success",
    output: {},
    tokensUsed: 150,
    model: "claude-haiku-4-5-20251001",
    duration: 2500,
  };

  it("renders LegacyContent when uiHint is absent (shows analysis text)", () => {
    const result: AgentExecutionResult = {
      ...baseResult,
      output: {
        analysis: "Code quality looks good overall",
      },
    };
    render(<AgentTaskResult result={result} />);
    expect(screen.getByText("Code quality looks good overall")).toBeInTheDocument();
    expect(screen.getByText("실행 결과")).toBeInTheDocument();
    expect(screen.getByText("success")).toBeInTheDocument();
  });

  it("renders DynamicRenderer when uiHint is present", () => {
    const result: AgentExecutionResult = {
      ...baseResult,
      output: {
        analysis: "This should not show as legacy",
        uiHint: {
          layout: "card",
          sections: [
            { type: "text", title: "Dynamic Section", data: "Dynamic content here" },
          ],
        },
      },
    };
    render(<AgentTaskResult result={result} />);
    // DynamicRenderer renders the section
    expect(screen.getByText("Dynamic Section")).toBeInTheDocument();
    expect(screen.getByText("Dynamic content here")).toBeInTheDocument();
    // LegacyContent should NOT render
    expect(screen.queryByText("분석")).not.toBeInTheDocument();
  });
});
