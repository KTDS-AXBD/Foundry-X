/**
 * Sprint 221 F456: PRD 확정 + 버전 관리 서비스
 * - PDCA 기반 섹션 검증
 * - version 2 → confirmed 전환 + version 3 생성
 * - LCS line-level diff
 */

export interface PrdValidationResult {
  valid: boolean;
  errors: string[];
}

export interface DiffHunk {
  type: "added" | "removed" | "unchanged";
  content: string;
}

export interface GeneratedPrdRow {
  id: string;
  biz_item_id: string;
  version: number;
  status: string;
  content: string;
  criteria_snapshot: string | null;
  generated_at: number;
}

const REQUIRED_SECTIONS = [
  { label: "프로젝트 개요", pattern: /^#[^#].*(?:개요|Overview)/im },
  { label: "목표", pattern: /^##[^#].*(?:목표|Goal)/im },
  { label: "범위", pattern: /^##[^#].*(?:범위|Scope)/im },
  { label: "제약", pattern: /^##[^#].*(?:제약|Constraint)/im },
  { label: "성공 지표", pattern: /^##[^#].*(?:성공|Success|KPI)/im },
] as const;

const MIN_SECTION_LENGTH = 30;

export class PrdConfirmationService {
  constructor(private db: D1Database) {}

  validate(content: string): PrdValidationResult {
    const errors: string[] = [];

    for (const section of REQUIRED_SECTIONS) {
      const match = section.pattern.exec(content);
      if (!match) {
        errors.push(`섹션 누락: ${section.label}`);
        continue;
      }
      // 섹션 헤더 이후 텍스트 길이 확인
      const matchedText = match[0] ?? "";
      const afterHeader = content.slice(content.indexOf(matchedText) + matchedText.length);
      const sectionBody = (afterHeader.split(/^#{1,3}\s/m)[0] ?? "").trim();
      if (sectionBody.length < MIN_SECTION_LENGTH) {
        errors.push(`섹션 내용 부족: ${section.label} (${sectionBody.length}자 < ${MIN_SECTION_LENGTH}자)`);
      }
    }

    // 5개 중 4개 이상 통과해야 함
    const failCount = errors.length;
    const valid = failCount <= 1;
    return { valid, errors };
  }

  async getPrd(bizItemId: string, prdId: string): Promise<GeneratedPrdRow | null> {
    return this.db
      .prepare("SELECT * FROM biz_generated_prds WHERE id = ? AND biz_item_id = ?")
      .bind(prdId, bizItemId)
      .first<GeneratedPrdRow>();
  }

  async confirm(bizItemId: string, prdId: string): Promise<{ prd: GeneratedPrdRow; errors: string[] }> {
    const prd = await this.getPrd(bizItemId, prdId);
    if (!prd) throw new Error("PRD_NOT_FOUND");
    if (prd.version !== 2) throw new Error("VERSION_NOT_2");

    const { valid, errors } = this.validate(prd.content);
    if (!valid) return { prd, errors };

    // version 3 생성
    const newId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await this.db
      .prepare(
        `INSERT INTO biz_generated_prds
         (id, biz_item_id, version, status, content, criteria_snapshot, source_type, generated_at)
         VALUES (?, ?, 3, 'confirmed', ?, ?, ?, ?)`
      )
      .bind(newId, bizItemId, prd.content, prd.criteria_snapshot, "confirmed", now)
      .run();

    // version 2 상태를 reviewing → confirmed
    await this.db
      .prepare("UPDATE biz_generated_prds SET status = 'confirmed' WHERE id = ?")
      .bind(prdId)
      .run();

    const created = await this.getPrd(bizItemId, newId);
    return { prd: created!, errors: [] };
  }

  async listPrds(bizItemId: string): Promise<{ prds: Array<GeneratedPrdRow & { contentPreview: string }> }> {
    const { results } = await this.db
      .prepare(
        "SELECT * FROM biz_generated_prds WHERE biz_item_id = ? ORDER BY version ASC"
      )
      .bind(bizItemId)
      .all<GeneratedPrdRow>();

    return {
      prds: (results ?? []).map((r) => ({
        ...r,
        contentPreview: r.content.slice(0, 200),
      })),
    };
  }

  async editPrd(bizItemId: string, prdId: string, content: string): Promise<GeneratedPrdRow> {
    const prd = await this.getPrd(bizItemId, prdId);
    if (!prd) throw new Error("PRD_NOT_FOUND");
    if (prd.version === 1) throw new Error("READ_ONLY");

    const now = Math.floor(Date.now() / 1000);
    await this.db
      .prepare("UPDATE biz_generated_prds SET content = ?, generated_at = ? WHERE id = ?")
      .bind(content, now, prdId)
      .run();

    return (await this.getPrd(bizItemId, prdId))!;
  }

  diff(content1: string, content2: string): DiffHunk[] {
    const lines1 = content1.split("\n");
    const lines2 = content2.split("\n");
    const m = lines1.length;
    const n = lines2.length;

    // LCS dp table
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0) as number[]);
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const l1 = lines1[i - 1];
        const l2 = lines2[j - 1];
        if (l1 !== undefined && l2 !== undefined && l1 === l2) {
          dp[i]![j] = (dp[i - 1]?.[j - 1] ?? 0) + 1;
        } else {
          dp[i]![j] = Math.max(dp[i - 1]?.[j] ?? 0, dp[i]?.[j - 1] ?? 0);
        }
      }
    }

    // 역추적
    const hunks: DiffHunk[] = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      const l1 = lines1[i - 1];
      const l2 = lines2[j - 1];
      if (i > 0 && j > 0 && l1 !== undefined && l2 !== undefined && l1 === l2) {
        hunks.unshift({ type: "unchanged", content: l1 });
        i--; j--;
      } else if (j > 0 && (i === 0 || (dp[i]?.[j - 1] ?? 0) >= (dp[i - 1]?.[j] ?? 0))) {
        hunks.unshift({ type: "added", content: l2 ?? "" });
        j--;
      } else {
        hunks.unshift({ type: "removed", content: l1 ?? "" });
        i--;
      }
    }

    return hunks;
  }
}
