import { z } from "zod";

export const backupCreateSchema = z.object({
  backupType: z.enum(["manual", "auto", "pre_deploy"]).default("manual"),
  scope: z.enum(["full", "item"]).default("full"),
  bizItemId: z.string().optional(),
});

export const backupImportSchema = z.object({
  backupId: z.string(),
  strategy: z.enum(["replace", "merge"]).default("merge"),
});

export const backupListQuerySchema = z.object({
  backupType: z.enum(["manual", "auto", "pre_deploy"]).optional(),
  scope: z.enum(["full", "item"]).optional(),
  bizItemId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type BackupCreateInput = z.infer<typeof backupCreateSchema>;
export type BackupImportInput = z.infer<typeof backupImportSchema>;
export type BackupListQuery = z.infer<typeof backupListQuerySchema>;

export interface BackupMeta {
  id: string;
  tenantId: string;
  backupType: "manual" | "auto" | "pre_deploy";
  scope: "full" | "item";
  bizItemId: string | null;
  tablesIncluded: string[];
  itemCount: number;
  sizeBytes: number;
  createdBy: string;
  createdAt: string;
}

export interface ImportResult {
  inserted: number;
  skipped: number;
  deleted: number;
  tables: Record<string, { inserted: number; skipped: number }>;
}
