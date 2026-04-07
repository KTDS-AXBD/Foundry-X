/**
 * F441: 파일 업로드 서비스 (Sprint 213)
 * R2 Presigned URL 발급 + D1 메타데이터 관리
 */
import type { Env } from "../../../env.js";
import type { PresignFileInput, UploadedFile } from "../schemas/file.js";

function generateId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateR2Key(tenantId: string, filename: string): string {
  const ext = filename.split(".").pop() ?? "bin";
  const timestamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${tenantId}/${timestamp}_${rand}.${ext}`;
}

export class FileService {
  async presign(
    env: Env,
    tenantId: string,
    input: PresignFileInput,
  ): Promise<{ presigned_url: string; file_id: string; r2_key: string }> {
    const fileId = generateId();
    const r2Key = generateR2Key(tenantId, input.filename);

    // R2 Presigned URL 생성 (1시간 유효)
    // Note: createPresignedUrl은 Workers R2 바인딩의 확장 API (타입 단언 필요)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const presignedUrl = await (env.FILES_BUCKET as any).createPresignedUrl("PUT", r2Key, {
      expiresIn: 3600,
    }) as string;

    // D1에 pending 상태로 메타 저장
    await env.DB.prepare(
      `INSERT INTO uploaded_files (id, tenant_id, biz_item_id, filename, mime_type, r2_key, size_bytes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
      .bind(fileId, tenantId, input.biz_item_id ?? null, input.filename, input.mime_type, r2Key, input.size_bytes)
      .run();

    return { presigned_url: presignedUrl, file_id: fileId, r2_key: r2Key };
  }

  async confirm(
    env: Env,
    tenantId: string,
    fileId: string,
  ): Promise<UploadedFile> {
    const result = await env.DB.prepare(
      `UPDATE uploaded_files SET status = 'uploaded'
       WHERE id = ? AND tenant_id = ? AND status = 'pending'
       RETURNING *`,
    )
      .bind(fileId, tenantId)
      .first<UploadedFile>();

    if (!result) {
      throw new Error("파일을 찾을 수 없거나 이미 확인된 파일이에요");
    }
    return result;
  }

  async list(
    env: Env,
    tenantId: string,
    bizItemId?: string,
  ): Promise<UploadedFile[]> {
    if (bizItemId) {
      const { results } = await env.DB.prepare(
        `SELECT * FROM uploaded_files WHERE tenant_id = ? AND biz_item_id = ? ORDER BY created_at DESC`,
      )
        .bind(tenantId, bizItemId)
        .all<UploadedFile>();
      return results;
    }

    const { results } = await env.DB.prepare(
      `SELECT * FROM uploaded_files WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 100`,
    )
      .bind(tenantId)
      .all<UploadedFile>();
    return results;
  }

  async delete(env: Env, tenantId: string, fileId: string): Promise<void> {
    const file = await env.DB.prepare(
      `SELECT r2_key FROM uploaded_files WHERE id = ? AND tenant_id = ?`,
    )
      .bind(fileId, tenantId)
      .first<{ r2_key: string }>();

    if (!file) {
      throw new Error("파일을 찾을 수 없어요");
    }

    // R2와 D1 동시 삭제 (cascade로 parsed_documents도 삭제됨)
    await Promise.all([
      env.FILES_BUCKET.delete(file.r2_key),
      env.DB.prepare(`DELETE FROM uploaded_files WHERE id = ? AND tenant_id = ?`)
        .bind(fileId, tenantId)
        .run(),
    ]);
  }

  async getById(env: Env, tenantId: string, fileId: string): Promise<UploadedFile | null> {
    return env.DB.prepare(
      `SELECT * FROM uploaded_files WHERE id = ? AND tenant_id = ?`,
    )
      .bind(fileId, tenantId)
      .first<UploadedFile>();
  }

  async updateStatus(
    env: Env,
    fileId: string,
    status: UploadedFile["status"],
  ): Promise<void> {
    await env.DB.prepare(
      `UPDATE uploaded_files SET status = ? WHERE id = ?`,
    )
      .bind(status, fileId)
      .run();
  }
}

export const fileService = new FileService();
