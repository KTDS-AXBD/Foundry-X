/**
 * F441: 파일 업로드 인프라 스키마 (Sprint 213)
 */
import { z } from "zod";

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const PresignFileSchema = z.object({
  filename: z.string().min(1).max(255),
  mime_type: z.enum(ALLOWED_MIME_TYPES),
  biz_item_id: z.string().optional(),
  size_bytes: z.number().int().positive().max(MAX_FILE_SIZE, {
    message: "파일 크기는 50MB를 초과할 수 없어요",
  }),
});

export const ConfirmFileSchema = z.object({
  file_id: z.string().min(1),
});

export type PresignFileInput = z.infer<typeof PresignFileSchema>;
export type ConfirmFileInput = z.infer<typeof ConfirmFileSchema>;

export interface UploadedFile {
  id: string;
  tenant_id: string;
  biz_item_id: string | null;
  filename: string;
  mime_type: string;
  r2_key: string;
  size_bytes: number;
  status: "pending" | "uploaded" | "parsing" | "parsed" | "error";
  created_at: number;
}
