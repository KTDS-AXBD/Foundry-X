/**
 * F223: 문서 Sharding — Markdown 문서를 섹션별로 분할하고 에이전트 역할에 매칭
 */

export interface DocumentShard {
  id: string;
  documentId: string;
  documentTitle: string;
  sectionIndex: number;
  heading: string;
  content: string;
  keywords: string[];
  agentRoles: string[];
  tokenCount: number;
  orgId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShardDocumentInput {
  documentId: string;
  title?: string;
  content: string;
  orgId?: string;
}

interface Section {
  heading: string;
  content: string;
  index: number;
}

interface ShardRow {
  id: string;
  document_id: string;
  document_title: string;
  section_index: number;
  heading: string;
  content: string;
  keywords: string;
  agent_roles: string;
  token_count: number;
  org_id: string;
  created_at: string;
  updated_at: string;
}

/** 키워드 → 에이전트 역할 매칭 테이블 */
const KEYWORD_ROLE_MAP: Record<string, string[]> = {
  reviewer: ["review", "lint", "code quality", "code-review", "pr", "pull request", "eslint", "prettier", "diff"],
  planner: ["plan", "task", "dependency", "scope", "requirement", "milestone", "sprint", "schedule"],
  architect: ["architecture", "design", "pattern", "module", "component", "dependency graph", "tech stack"],
  test: ["test", "coverage", "assertion", "vitest", "jest", "tdd", "unit test", "integration test"],
  security: ["security", "owasp", "vulnerability", "xss", "csrf", "injection", "auth", "authentication"],
  qa: ["qa", "acceptance", "browser", "playwright", "e2e", "end-to-end", "user acceptance"],
  infra: ["infra", "deploy", "migration", "ci", "cd", "docker", "kubernetes", "cloudflare", "workers"],
};

function toDocumentShard(row: ShardRow): DocumentShard {
  return {
    id: row.id,
    documentId: row.document_id,
    documentTitle: row.document_title,
    sectionIndex: row.section_index,
    heading: row.heading,
    content: row.content,
    keywords: JSON.parse(row.keywords || "[]"),
    agentRoles: JSON.parse(row.agent_roles || "[]"),
    tokenCount: row.token_count,
    orgId: row.org_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ShardDocService {
  constructor(private db: D1Database) {}

  /** 문서 → shard 분할 및 저장 */
  async shardDocument(input: ShardDocumentInput): Promise<DocumentShard[]> {
    // 기존 shard 삭제 (재처리 시)
    await this.deleteShards(input.documentId);

    const sections = this.parseMarkdownSections(input.content);
    const title = input.title ?? this.extractTitle(input.content) ?? input.documentId;
    const now = new Date().toISOString();
    const shards: DocumentShard[] = [];

    for (const section of sections) {
      const id = `shard-${crypto.randomUUID().slice(0, 8)}`;
      const keywords = this.extractKeywords(section);
      const agentRoles = this.matchAgentRoles(keywords);
      const tokenCount = this.estimateTokens(section.content);

      await this.db
        .prepare(
          `INSERT INTO document_shards
           (id, document_id, document_title, section_index, heading, content, keywords, agent_roles, token_count, org_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          input.documentId,
          title,
          section.index,
          section.heading,
          section.content,
          JSON.stringify(keywords),
          JSON.stringify(agentRoles),
          tokenCount,
          input.orgId ?? "",
          now,
          now,
        )
        .run();

      shards.push({
        id,
        documentId: input.documentId,
        documentTitle: title,
        sectionIndex: section.index,
        heading: section.heading,
        content: section.content,
        keywords,
        agentRoles,
        tokenCount,
        orgId: input.orgId ?? "",
        createdAt: now,
        updatedAt: now,
      });
    }

    return shards;
  }

  /** 에이전트 역할로 관련 shard 조회 */
  async getShardsForAgent(agentRole: string, documentId?: string): Promise<DocumentShard[]> {
    // SQLite JSON 검색: agent_roles 배열에 해당 역할이 포함된 shard
    let query = `SELECT * FROM document_shards WHERE agent_roles LIKE ?`;
    const bindings: unknown[] = [`%"${agentRole}"%`];

    if (documentId) {
      query += " AND document_id = ?";
      bindings.push(documentId);
    }
    query += " ORDER BY section_index";

    const { results } = await this.db
      .prepare(query)
      .bind(...bindings)
      .all<ShardRow>();

    return results.map(toDocumentShard);
  }

  /** 문서별 shard 목록 */
  async listShards(documentId: string, limit = 50, offset = 0): Promise<DocumentShard[]> {
    const { results } = await this.db
      .prepare(
        "SELECT * FROM document_shards WHERE document_id = ? ORDER BY section_index LIMIT ? OFFSET ?",
      )
      .bind(documentId, limit, offset)
      .all<ShardRow>();

    return results.map(toDocumentShard);
  }

  /** 문서 shard 전체 삭제 */
  async deleteShards(documentId: string): Promise<void> {
    await this.db
      .prepare("DELETE FROM document_shards WHERE document_id = ?")
      .bind(documentId)
      .run();
  }

  /** Markdown → 섹션 분할 (## 기준) */
  parseMarkdownSections(content: string): Section[] {
    const lines = content.split("\n");
    const sections: Section[] = [];
    let currentHeading = "_preamble";
    let currentLines: string[] = [];
    let sectionIndex = 0;
    let inCodeBlock = false;

    for (const line of lines) {
      // 코드 블록 토글
      if (line.trim().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        currentLines.push(line);
        continue;
      }

      if (inCodeBlock) {
        currentLines.push(line);
        continue;
      }

      // ## 헤딩 감지 (h2 기준 분할)
      const headingMatch = line.match(/^##\s+(.+)/) as RegExpMatchArray | null;
      if (headingMatch && headingMatch[1]) {
        // 이전 섹션 저장
        if (currentLines.length > 0) {
          const text = currentLines.join("\n").trim();
          if (text) {
            sections.push({
              heading: currentHeading,
              content: text,
              index: sectionIndex++,
            });
          }
        }
        currentHeading = headingMatch[1].trim();
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }

    // 마지막 섹션
    const lastText = currentLines.join("\n").trim();
    if (lastText) {
      sections.push({
        heading: currentHeading,
        content: lastText,
        index: sectionIndex,
      });
    }

    return sections;
  }

  /** 문서 제목 추출 (# 헤딩) */
  private extractTitle(content: string): string | null {
    const match = content.match(/^#\s+(.+)/m) as RegExpMatchArray | null;
    return match && match[1] ? match[1].trim() : null;
  }

  /** 섹션 → 키워드 추출 */
  extractKeywords(section: Section): string[] {
    const text = `${section.heading} ${section.content}`.toLowerCase();
    const allKeywords = Object.values(KEYWORD_ROLE_MAP).flat();
    return [...new Set(allKeywords.filter((kw) => text.includes(kw)))];
  }

  /** 키워드 → 에이전트 역할 매칭 */
  matchAgentRoles(keywords: string[]): string[] {
    const roles = new Set<string>();
    for (const [role, roleKeywords] of Object.entries(KEYWORD_ROLE_MAP)) {
      if (roleKeywords.some((kw) => keywords.includes(kw))) {
        roles.add(role);
      }
    }
    return [...roles];
  }

  /** 토큰 수 추정 (단어 수 × 1.3) */
  private estimateTokens(text: string): number {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return Math.ceil(wordCount * 1.3);
  }
}
