/**
 * F443: 문서 기반 아이템 자동 추출 서비스 (Sprint 214)
 * 파싱된 텍스트에서 Workers AI로 사업 아이템 제목/설명을 추출한다.
 */

import type { Ai } from "@cloudflare/workers-types";

export interface ExtractedItemInfo {
  title: string;
  description: string;
  confidence: number;
}

const MAX_CHARS_PER_DOC = 2000;
const MAX_DOCS = 3;

export class DocumentExtractService {
  async extractItemInfo(
    ai: Ai,
    parsedTexts: Array<{ filename: string; content_text: string }>,
  ): Promise<ExtractedItemInfo> {
    if (parsedTexts.length === 0) {
      return { title: "", description: "", confidence: 0 };
    }

    // 문서 텍스트를 합쳐서 컨텍스트 구성 (최대 MAX_DOCS개, 각 MAX_CHARS_PER_DOC자)
    const docContext = parsedTexts
      .slice(0, MAX_DOCS)
      .map((d) => `[${d.filename}]\n${d.content_text.slice(0, MAX_CHARS_PER_DOC)}`)
      .join("\n\n---\n\n");

    const prompt = `당신은 B2B 사업 기획 전문가입니다.
아래 문서 내용을 분석하여 핵심 사업 아이디어를 한 문장 제목과 간결한 설명으로 추출해주세요.

[문서 내용]
${docContext}

반드시 아래 JSON 형식으로만 답변하세요 (다른 텍스트 없이):
{"title": "50자 이내 사업 아이디어 제목", "description": "200자 이내 핵심 내용 요약", "confidence": 0.0~1.0}`;

    try {
      const response = await (ai as unknown as {
        run: (model: string, params: { prompt: string; max_tokens: number }) => Promise<{ response?: string }>;
      }).run("@cf/meta/llama-3.1-8b-instruct", {
        prompt,
        max_tokens: 256,
      });

      const raw = response.response ?? "";
      // JSON 파싱 시도
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          title?: string;
          description?: string;
          confidence?: number;
        };
        return {
          title: String(parsed.title ?? "").slice(0, 100),
          description: String(parsed.description ?? "").slice(0, 300),
          confidence: Math.min(1, Math.max(0, Number(parsed.confidence ?? 0.7))),
        };
      }
    } catch {
      // Workers AI 실패 시 graceful fallback
    }

    // Fallback: 첫 번째 문서의 파일명에서 제목 추정
    const firstFilename = parsedTexts[0]!.filename.replace(/\.[^.]+$/, "");
    return {
      title: firstFilename.slice(0, 100),
      description: "",
      confidence: 0.1,
    };
  }

  /**
   * D1에서 biz_item_id 또는 file_ids 기준으로 파싱된 문서를 조회한다.
   */
  async fetchParsedTexts(
    db: D1Database,
    options: { bizItemId?: string; fileIds?: string[]; tenantId: string },
  ): Promise<Array<{ filename: string; content_text: string }>> {
    if (options.fileIds && options.fileIds.length > 0) {
      const placeholders = options.fileIds.map(() => "?").join(", ");
      const { results } = await db
        .prepare(
          `SELECT f.filename, pd.content_text
           FROM parsed_documents pd
           JOIN uploaded_files f ON f.id = pd.file_id
           WHERE pd.file_id IN (${placeholders})
             AND f.tenant_id = ?
           ORDER BY pd.parsed_at DESC
           LIMIT ${MAX_DOCS}`,
        )
        .bind(...options.fileIds, options.tenantId)
        .all<{ filename: string; content_text: string }>();
      return results;
    }

    if (options.bizItemId) {
      const { results } = await db
        .prepare(
          `SELECT f.filename, pd.content_text
           FROM parsed_documents pd
           JOIN uploaded_files f ON f.id = pd.file_id
           WHERE f.biz_item_id = ? AND f.tenant_id = ?
           ORDER BY pd.parsed_at DESC
           LIMIT ${MAX_DOCS}`,
        )
        .bind(options.bizItemId, options.tenantId)
        .all<{ filename: string; content_text: string }>();
      return results;
    }

    return [];
  }
}

export const documentExtractService = new DocumentExtractService();
