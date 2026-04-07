/**
 * F441+F442: 파일 업로드 + 문서 파싱 라우트 (Sprint 213)
 */
import { Hono } from "hono";
import type { Env } from "../../../env.js";
import type { TenantVariables } from "../../../middleware/tenant.js";
import { PresignFileSchema, ConfirmFileSchema } from "../schemas/file.js";
import { fileService } from "../services/file-service.js";
import { documentParserService } from "../services/document-parser-service.js";

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

// ─── F441: GET /files — 파일 목록 ───
filesRoute.get("/files", async (c) => {
  const orgId = c.get("orgId");
  const bizItemId = c.req.query("biz_item_id");
  const files = await fileService.list(c.env, orgId, bizItemId);
  return c.json({ files });
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
