/**
 * F441+F442: 파일 업로드 + 파싱 라우트 테스트 (Sprint 213)
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createMockD1 } from "../../../../__tests__/helpers/mock-d1.js";
import { filesRoute } from "../files.js";
import { Hono } from "hono";
import type { Env } from "../../../../env.js";

const DDL = `
  CREATE TABLE IF NOT EXISTS uploaded_files (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    biz_item_id TEXT,
    filename    TEXT NOT NULL,
    mime_type   TEXT NOT NULL,
    r2_key      TEXT NOT NULL UNIQUE,
    size_bytes  INTEGER NOT NULL DEFAULT 0,
    status      TEXT NOT NULL DEFAULT 'pending',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS parsed_documents (
    id                 TEXT PRIMARY KEY,
    file_id            TEXT NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    content_text       TEXT NOT NULL,
    content_structured TEXT,
    page_count         INTEGER NOT NULL DEFAULT 0,
    parsed_at          INTEGER NOT NULL DEFAULT (unixepoch())
  );
`;

// R2 bucket mock — Workers R2 바인딩 실제 API(put/get/delete)만 제공
// createPresignedUrl은 존재하지 않으므로 Worker 프록시 업로드 패턴 사용 (S246)
const mockR2 = {
  put: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  get: vi.fn().mockResolvedValue({
    arrayBuffer: async () => new ArrayBuffer(8),
  }),
};

function createApp(db: D1Database) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("*", async (c, next) => {
    c.set("orgId" as never, "org_test");
    c.set("jwtPayload" as never, { sub: "test-user" });
    await next();
  });
  app.route("/api", filesRoute);
  return {
    request: (path: string, init?: RequestInit) =>
      app.request(path, init, {
        DB: db,
        FILES_BUCKET: mockR2,
        AI: {},
      } as unknown as Env),
  };
}

describe("F441: 파일 업로드 라우트", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    const db = mockDb as unknown as D1Database;
    app = createApp(db);
    vi.clearAllMocks();
  });

  it("POST /files/presign — 유효한 요청 시 presigned_url 반환", async () => {
    const res = await app.request("/api/files/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "test.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json<{ presigned_url: string; file_id: string }>();
    // Worker 프록시 업로드 URL 패턴: ${origin}/api/files/${fileId}/upload
    expect(body.presigned_url).toMatch(/\/api\/files\/file_[^/]+\/upload$/);
    expect(body.file_id).toMatch(/^file_/);
  });

  it("POST /files/presign — 크기 초과 시 400", async () => {
    const res = await app.request("/api/files/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "big.pdf",
        mime_type: "application/pdf",
        size_bytes: 100 * 1024 * 1024, // 100MB
      }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /files/presign — 지원하지 않는 MIME 타입 시 400", async () => {
    const res = await app.request("/api/files/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "image.png",
        mime_type: "image/png",
        size_bytes: 1024,
      }),
    });
    expect(res.status).toBe(400);
  });

  it("POST /files/confirm — 유효한 file_id로 업로드 확인", async () => {
    // presign 먼저
    const presignRes = await app.request("/api/files/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: "test.pdf",
        mime_type: "application/pdf",
        size_bytes: 1024,
      }),
    });
    const { file_id } = await presignRes.json<{ file_id: string }>();

    const res = await app.request("/api/files/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id }),
    });

    expect(res.status).toBe(200);
    const body = await res.json<{ status: string }>();
    expect(body.status).toBe("uploaded");
  });

  it("GET /files — 파일 목록 반환 (tenant 격리)", async () => {
    // presign + confirm 파일 2개 등록
    for (const name of ["a.pdf", "b.docx"]) {
      const pr = await app.request("/api/files/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: name,
          mime_type: name.endsWith("pdf")
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          size_bytes: 1024,
        }),
      });
      const { file_id } = await pr.json<{ file_id: string }>();
      await app.request("/api/files/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id }),
      });
    }

    const res = await app.request("/api/files");
    expect(res.status).toBe(200);
    const body = await res.json<{ files: unknown[] }>();
    expect(body.files.length).toBe(2);
  });

  it("DELETE /files/:id — R2 + D1 동시 삭제", async () => {
    const pr = await app.request("/api/files/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: "del.pdf", mime_type: "application/pdf", size_bytes: 100 }),
    });
    const { file_id } = await pr.json<{ file_id: string }>();
    await app.request("/api/files/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id }),
    });

    const res = await app.request(`/api/files/${file_id}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(mockR2.delete).toHaveBeenCalledOnce();

    // 삭제 후 목록에서 사라짐
    const listRes = await app.request("/api/files");
    const body = await listRes.json<{ files: unknown[] }>();
    expect(body.files.length).toBe(0);
  });
});

describe("F442: 문서 파싱 라우트", () => {
  let app: ReturnType<typeof createApp>;
  let uploadedFileId: string;

  beforeEach(async () => {
    const mockDb = createMockD1();
    await mockDb.exec(DDL);
    const db = mockDb as unknown as D1Database;
    app = createApp(db);
    vi.clearAllMocks();

    // 파싱 테스트용 파일 미리 업로드
    const pr = await app.request("/api/files/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: "doc.pdf", mime_type: "application/pdf", size_bytes: 1024 }),
    });
    const { file_id } = await pr.json<{ file_id: string }>();
    uploadedFileId = file_id;
    await app.request("/api/files/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id }),
    });
  });

  it("POST /files/:id/parse — 파싱 트리거 성공", async () => {
    const res = await app.request(`/api/files/${uploadedFileId}/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(200);
    const body = await res.json<{ status: string; file_id: string }>();
    expect(body.status).toBe("parsed");
    expect(body.file_id).toBe(uploadedFileId);
  });

  it("GET /files/:id/parsed — 파싱 결과 조회", async () => {
    // 파싱 먼저 트리거
    await app.request(`/api/files/${uploadedFileId}/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const res = await app.request(`/api/files/${uploadedFileId}/parsed`);
    expect(res.status).toBe(200);
    const body = await res.json<{ file_id: string; content_text: string }>();
    expect(body.file_id).toBe(uploadedFileId);
    expect(typeof body.content_text).toBe("string");
  });

  it("POST /files/:id/parse — 미존재 파일 시 404", async () => {
    const res = await app.request("/api/files/nonexistent/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(404);
  });
});
