/**
 * C9: PPTX Content Parser Tests
 */
import { describe, it, expect } from "vitest";
import {
  parseContentBlocks,
  parseKpiItems,
  parseTableData,
  parseBulletItems,
} from "../core/offering/services/pptx-content-parser.js";

describe("parseContentBlocks", () => {
  it("returns empty array for empty content", () => {
    expect(parseContentBlocks("")).toEqual([]);
    expect(parseContentBlocks("   ")).toEqual([]);
  });

  it("parses headings", () => {
    const blocks = parseContentBlocks("# Title\n## Subtitle\n### Sub-sub");
    expect(blocks).toEqual([
      { type: "heading", text: "Title", level: 1 },
      { type: "heading", text: "Subtitle", level: 2 },
      { type: "heading", text: "Sub-sub", level: 3 },
    ]);
  });

  it("parses bullet items with - and *", () => {
    const blocks = parseContentBlocks("- First item\n* Second item");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: "bullet", text: "First item", level: 0 });
    expect(blocks[1]).toEqual({ type: "bullet", text: "Second item", level: 0 });
  });

  it("parses indented bullets with level 1", () => {
    const blocks = parseContentBlocks("- Top\n    - Indented");
    expect(blocks[1]).toEqual({ type: "bullet", text: "Indented", level: 1 });
  });

  it("parses numbered lists", () => {
    const blocks = parseContentBlocks("1. First\n2. Second");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: "bullet", text: "First", level: 0 });
    expect(blocks[1]).toEqual({ type: "bullet", text: "Second", level: 0 });
  });

  it("parses bold text", () => {
    const blocks = parseContentBlocks("**Important statement**");
    expect(blocks).toEqual([{ type: "bold", text: "Important statement" }]);
  });

  it("parses plain text", () => {
    const blocks = parseContentBlocks("Hello world");
    expect(blocks).toEqual([{ type: "text", text: "Hello world" }]);
  });

  it("strips inline markdown from text and bullets", () => {
    const blocks = parseContentBlocks("- **bold** and `code` and [link](url)");
    expect(blocks[0]?.text).toBe("bold and code and link");
  });

  it("skips table rows", () => {
    const blocks = parseContentBlocks("Title\n| a | b |\n|---|---|\n| 1 | 2 |\nFooter");
    const texts = blocks.map((b) => b.text);
    expect(texts).not.toContain("| a | b |");
    expect(texts).toContain("Title");
    expect(texts).toContain("Footer");
  });

  it("parses mixed content", () => {
    const input = `## Overview
- Item one
- Item two
Some paragraph text
**Conclusion**`;
    const blocks = parseContentBlocks(input);
    expect(blocks).toEqual([
      { type: "heading", text: "Overview", level: 2 },
      { type: "bullet", text: "Item one", level: 0 },
      { type: "bullet", text: "Item two", level: 0 },
      { type: "text", text: "Some paragraph text" },
      { type: "bold", text: "Conclusion" },
    ]);
  });
});

describe("parseKpiItems", () => {
  it("parses value with parenthesized label", () => {
    const result = parseKpiItems(["약 150억원 (3개년 매출 목표)"]);
    expect(result[0]?.value).toBe("약 150억원");
    expect(result[0]?.label).toBe("3개년 매출 목표");
  });

  it("parses number-prefixed items", () => {
    const result = parseKpiItems(["5개 PoC 고객사 확보"]);
    expect(result[0]?.value).toBe("5개");
    expect(result[0]?.label).toBe("PoC 고객사 확보");
  });

  it("parses KEY VALUE pattern", () => {
    const result = parseKpiItems(["ROI 340%"]);
    expect(result[0]?.value).toBe("ROI 340%");
  });

  it("falls back to full text as value", () => {
    const result = parseKpiItems(["No numbers here"]);
    expect(result[0]?.value).toBe("No numbers here");
    expect(result[0]?.label).toBe("");
  });
});

describe("parseTableData", () => {
  it("parses standard markdown table", () => {
    const input = `| Name | Value |
|------|-------|
| A    | 100   |
| B    | 200   |`;
    const result = parseTableData(input);
    expect(result).not.toBeNull();
    expect(result?.headers).toEqual(["Name", "Value"]);
    expect(result?.rows).toEqual([
      ["A", "100"],
      ["B", "200"],
    ]);
  });

  it("returns null for non-table content", () => {
    expect(parseTableData("Just plain text")).toBeNull();
    expect(parseTableData("| only one line |")).toBeNull();
  });

  it("pads short rows to match header count", () => {
    const input = `| A | B | C |
|---|---|---|
| 1 |   |`;
    const result = parseTableData(input);
    expect(result?.rows[0]).toHaveLength(3);
  });

  it("handles mixed table and text content", () => {
    const input = `Some intro text

| Col1 | Col2 |
|------|------|
| X    | Y    |

Some outro text`;
    const result = parseTableData(input);
    expect(result).not.toBeNull();
    expect(result?.headers).toEqual(["Col1", "Col2"]);
  });
});

describe("parseBulletItems", () => {
  it("extracts bullet items", () => {
    const result = parseBulletItems("- First\n- Second\n- Third");
    expect(result).toEqual(["First", "Second", "Third"]);
  });

  it("extracts * bullet items", () => {
    const result = parseBulletItems("* A\n* B");
    expect(result).toEqual(["A", "B"]);
  });

  it("falls back to paragraphs when no bullets", () => {
    const result = parseBulletItems("Para one\n\nPara two");
    expect(result).toEqual(["Para one", "Para two"]);
  });
});
