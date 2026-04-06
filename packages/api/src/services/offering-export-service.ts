/**
 * F372: Offering Export Service (Sprint 168)
 * F380: PPTX Export 추가 (Sprint 172)
 * Offering + Sections → HTML / PPTX 렌더링
 */
import {
  renderPptx,
  type OfferingRow,
  type SectionRow,
  type DesignTokenRow,
} from "./pptx-renderer.js";

export type { OfferingRow, SectionRow, DesignTokenRow };

export class OfferingExportService {
  constructor(private db: D1Database) {}

  private async getOfferingData(
    orgId: string,
    offeringId: string,
  ): Promise<{ offering: OfferingRow; sections: SectionRow[]; tokens: DesignTokenRow[] } | null> {
    const offering = await this.db
      .prepare("SELECT * FROM offerings WHERE id = ? AND org_id = ?")
      .bind(offeringId, orgId)
      .first<OfferingRow>();
    if (!offering) return null;

    const sectionsResult = await this.db
      .prepare(
        "SELECT * FROM offering_sections WHERE offering_id = ? AND is_included = 1 ORDER BY sort_order ASC",
      )
      .bind(offeringId)
      .all<SectionRow>();

    const tokensResult = await this.db
      .prepare("SELECT token_key, token_value, token_category FROM offering_design_tokens WHERE offering_id = ?")
      .bind(offeringId)
      .all<DesignTokenRow>();

    return {
      offering,
      sections: sectionsResult.results,
      tokens: tokensResult.results,
    };
  }

  async exportHtml(orgId: string, offeringId: string): Promise<string | null> {
    const data = await this.getOfferingData(orgId, offeringId);
    if (!data) return null;
    return this.renderHtml(data.offering, data.sections, data.tokens);
  }

  async exportPptx(orgId: string, offeringId: string): Promise<Uint8Array | null> {
    const data = await this.getOfferingData(orgId, offeringId);
    if (!data) return null;
    return renderPptx(data);
  }

  private renderHtml(
    offering: OfferingRow,
    sections: SectionRow[],
    tokens: DesignTokenRow[],
  ): string {
    const cssVariables = tokens
      .map((t) => `    --${t.token_key}: ${t.token_value};`)
      .join("\n");

    const sectionHtml = sections
      .map((s) => this.renderSection(s))
      .join("\n");

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(offering.title)}</title>
  <style>
    :root {
${cssVariables}
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.7; color: #1a1a1a; }
    .offering-doc { max-width: 960px; margin: 0 auto; padding: 40px 32px; }
    .offering-header { margin-bottom: 48px; border-bottom: 3px solid var(--color-primary, #2563eb); padding-bottom: 24px; }
    .offering-header h1 { font-size: 28px; font-weight: 700; }
    .offering-header .meta { font-size: 14px; color: #6b7280; margin-top: 8px; }
    .offering-section { margin-bottom: 32px; }
    .offering-section h2 { font-size: 20px; font-weight: 600; margin-bottom: 12px; color: var(--color-heading, #111827); }
    .offering-section .content { font-size: 15px; }
    .offering-section .content p { margin-bottom: 12px; }
    .offering-section .placeholder { color: #9ca3af; font-style: italic; }
  </style>
</head>
<body>
  <div class="offering-doc">
    <header class="offering-header">
      <h1>${escapeHtml(offering.title)}</h1>
      <div class="meta">v${offering.current_version} · ${offering.purpose} · ${offering.created_at}</div>
    </header>
${sectionHtml}
  </div>
</body>
</html>`;
  }

  private renderSection(section: SectionRow): string {
    const contentHtml = section.content
      ? `<div class="content">${markdownToHtml(section.content)}</div>`
      : `<div class="content"><p class="placeholder">(내용 없음)</p></div>`;

    return `    <section data-key="${escapeHtml(section.section_key)}" class="offering-section">
      <h2>${escapeHtml(section.title)}</h2>
      ${contentHtml}
    </section>`;
  }
}

/** 간단 HTML escape — Workers 환경용 (DOM 파서 없음) */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 간단 마크다운 → HTML 변환 (Workers 환경용) */
function markdownToHtml(md: string): string {
  return md
    .split("\n\n")
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("# ")) return `<h1>${escapeHtml(trimmed.slice(2))}</h1>`;
      if (trimmed.startsWith("## ")) return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
      if (trimmed.startsWith("### ")) return `<h3>${escapeHtml(trimmed.slice(4))}</h3>`;
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const items = trimmed
          .split("\n")
          .filter((l) => l.trim().startsWith("- ") || l.trim().startsWith("* "))
          .map((l) => `<li>${escapeHtml(l.trim().slice(2))}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${escapeHtml(trimmed)}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}
