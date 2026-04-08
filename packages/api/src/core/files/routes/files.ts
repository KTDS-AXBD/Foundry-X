/**
 * F441+F442: 파일 업로드 + 문서 파싱 라우트 (Sprint 213)
 * F443: 문서 기반 아이템 추출 + GET /files JOIN 개선 (Sprint 214)
 */
import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { PresignFileSchema, ConfirmFileSchema } from "../schemas/file.js";
import { fileService } from "../services/file-service.js";
import { documentParserService } from "../services/document-parser-service.js";
import { documentExtractService } from "../services/document-extract-service.js";

const ExtractItemSchema = z.object({
  file_ids: z.array(z.string()).min(1).max(10),
  biz_item_id: z.string().optional(),
});

export const filesRoute = new Hono<{ Bindings: Env; Variables: TenantVariables }>();

// ─── F441: POST /files/presign — Presigned URL 발급 ───
filesRoute.post("/files/presign", async (c) => {
  const orgId = c.get("orgId");
  const body = await c.req.json();
  const parsed = PresignFileSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "잘못된 요청이에요", details: parsed.error.flatten() }, 400);
  }

  try {
    const result = await fileService.presign(c.env, orgId, parsed.data);
    return c.json(result, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Presigned URL 생성에 실패했어요";
    return c.json({ error: msg }, 500);
  }
});

// ─── F441: POST /files/confirm — 업로드 완료 확인 ───
filesRoute.post("/files/confirm", async (c) => {
  const orgId = c.get("orgId");
  const body = await c.req.json();
  const parsed = ConfirmFileSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "file_id가 필요해요" }, 400);
  }

  try {
    const file = await fileService.confirm(c.env, orgId, parsed.data.file_id);
    return c.json(file);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "파일 확인에 실패했어요";
    return c.json({ error: msg }, 400);
  }
});

// ─── F441: GET /files — 파일 목록 (F443: parsed_at/page_count JOIN 추가) ───
filesRoute.get("/files", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.query("biz_item_id");

  // parsed_documents와 JOIN하여 파싱 상태 포함 반환
  let query: string;
  let bindings: (string | undefined)[];
  if (bizItemId) {
    query = `SELECT f.*, pd.parsed_at, pd.page_count
             FROM uploaded_files f
             LEFT JOIN parsed_documents pd ON pd.file_id = f.id
             WHERE f.tenant_id = ? AND f.biz_item_id = ?
             ORDER BY f.created_at DESC`;
    bindings = [orgId, bizItemId];
  } else {
    query = `SELECT f.*, pd.parsed_at, pd.page_count
             FROM uploaded_files f
             LEFT JOIN parsed_documents pd ON pd.file_id = f.id
             WHERE f.tenant_id = ?
             ORDER BY f.created_at DESC
             LIMIT 50`;
    bindings = [orgId];
  }

  const { results } = await c.env.DB.prepare(query).bind(...bindings).all();
  return c.json({ files: results });
});

// ─── F443: PATCH /files/:id — 파일 메타 업데이트 (biz_item_id 연결) ───
filesRoute.patch("/files/:id", async (c) => {
  const orgId = c.get("orgId");
  const fileId = c.req.param("id");
  const body = await c.req.json().catch(() => ({})) as { biz_item_id?: string };

  const file = await fileService.getById(c.env, orgId, fileId);
  if (!file) return c.json({ error: "파일을 찾을 수 없어요" }, 404);

  if ("biz_item_id" in body && body.biz_item_id !== undefined) {
    await c.env.DB.prepare(
      `UPDATE uploaded_files SET biz_item_id = ? WHERE id = ? AND tenant_id = ?`,
    )
      .bind(body.biz_item_id, fileId, orgId)
      .run();
  }

  return c.json({ ok: true });
});

// ─── F441: DELETE /files/:id — 파일 삭제 ───
filesRoute.delete("/files/:id", async (c) => {
  const orgId = c.get("orgId");
  const fileId = c.req.param("id");

  try {
    await fileService.delete(c.env, orgId, fileId);
    return c.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "파일 삭제에 실패했어요";
    return c.json({ error: msg }, 400);
  }
});

// ─── F442: POST /files/:id/parse — 파싱 트리거 ───
filesRoute.post("/files/:id/parse", async (c) => {
  const orgId = c.get("orgId");
  const fileId = c.req.param("id");

  const file = await fileService.getById(c.env, orgId, fileId);
  if (!file) {
    return c.json({ error: "파일을 찾을 수 없어요" }, 404);
  }
  if (file.status !== "uploaded") {
    return c.json({ error: "업로드가 완료된 파일만 파싱할 수 있어요" }, 400);
  }

  // 파싱 시작 표시
  await fileService.updateStatus(c.env, fileId, "parsing");

  try {
    // R2에서 파일 다운로드
    const obj = await c.env.FILES_BUCKET.get(file.r2_key);
    if (!obj) {
      await fileService.updateStatus(c.env, fileId, "error");
      return c.json({ error: "R2에서 파일을 가져올 수 없어요" }, 500);
    }

    const buffer = await obj.arrayBuffer();

    // MIME 타입별 파싱
    let result;
    if (file.mime_type.includes("pdf")) {
      result = await documentParserService.parsePdf(buffer, c.env.AI);
    } else if (file.mime_type.includes("presentationml")) {
      result = await documentParserService.parsePptx(buffer);
    } else if (file.mime_type.includes("wordprocessingml")) {
      result = await documentParserService.parseDocx(buffer);
    } else {
      await fileService.updateStatus(c.env, fileId, "error");
      return c.json({ error: "지원하지 않는 파일 형식이에요" }, 400);
    }

    // 파싱 결과 저장
    const parsedId = `parsed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await c.env.DB.prepare(
      `INSERT OR REPLACE INTO parsed_documents (id, file_id, content_text, content_structured, page_count)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(
        parsedId,
        fileId,
        result.content_text,
        JSON.stringify(result.content_structured),
        result.page_count,
      )
      .run();

    await fileService.updateStatus(c.env, fileId, "parsed");

    return c.json({
      file_id: fileId,
      parsed_id: parsedId,
      page_count: result.page_count,
      text_length: result.content_text.length,
      status: "parsed",
    });
  } catch (err) {
    await fileService.updateStatus(c.env, fileId, "error");
    const msg = err instanceof Error ? err.message : "파싱에 실패했어요";
    return c.json({ error: msg }, 500);
  }
});

// ─── F442: GET /files/:id/parsed — 파싱 결과 조회 ───
filesRoute.get("/files/:id/parsed", async (c) => {
  const orgId = c.get("orgId");
  const fileId = c.req.param("id");

  const file = await fileService.getById(c.env, orgId, fileId);
  if (!file) {
    return c.json({ error: "파일을 찾을 수 없어요" }, 404);
  }

  const parsed = await c.env.DB.prepare(
    `SELECT * FROM parsed_documents WHERE file_id = ? ORDER BY parsed_at DESC LIMIT 1`,
  )
    .bind(fileId)
    .first<{
      id: string;
      file_id: string;
      content_text: string;
      content_structured: string;
      page_count: number;
      parsed_at: number;
    }>();

  if (!parsed) {
    return c.json({ error: "파싱 결과가 없어요. 먼저 /parse를 호출하세요" }, 404);
  }

  return c.json({
    ...parsed,
    content_structured: JSON.parse(parsed.content_structured ?? "{}"),
  });
});

// ─── F443: POST /files/extract-item — 파싱 결과에서 아이템 정보 AI 추출 ───
filesRoute.post("/files/extract-item", async (c) => {
  const orgId = c.get("orgId");
  const body = await c.req.json();
  const validation = ExtractItemSchema.safeParse(body);

  if (!validation.success) {
    return c.json({ error: "file_ids 배열이 필요해요", details: validation.error.flatten() }, 400);
  }

  const { file_ids } = validation.data;

  try {
    const parsedTexts = await documentExtractService.fetchParsedTexts(c.env.DB, {
      fileIds: file_ids,
      tenantId: orgId,
    });

    if (parsedTexts.length === 0) {
      return c.json({ error: "파싱된 문서가 없어요. 먼저 /parse를 호출하세요" }, 404);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extracted = await documentExtractService.extractItemInfo(c.env.AI as any, parsedTexts);
    return c.json(extracted);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "추출에 실패했어요";
    return c.json({ error: msg }, 500);
  }
});
