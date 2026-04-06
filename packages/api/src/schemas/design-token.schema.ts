/**
 * F381: Design Token Zod Schemas (Sprint 173)
 */
import { z } from "zod";

// ── Token Category ─────────────────────────────

export const TokenCategory = z.enum(["color", "typography", "layout", "spacing"]);
export type TokenCategory = z.infer<typeof TokenCategory>;

// ── Design Token ───────────────────────────────

export const DesignTokenSchema = z.object({
  tokenKey: z.string().min(1).max(100),
  tokenValue: z.string().min(1).max(200),
  tokenCategory: TokenCategory,
});
export type DesignToken = z.infer<typeof DesignTokenSchema>;

// ── Bulk Update ────────────────────────────────

export const BulkUpdateTokensSchema = z.object({
  tokens: z.array(DesignTokenSchema).min(1).max(200),
});
export type BulkUpdateTokensInput = z.infer<typeof BulkUpdateTokensSchema>;

// ── JSON Format Response ───────────────────────

export interface DesignTokenJson {
  color: Record<string, string>;
  typography: Record<string, string>;
  layout: Record<string, string>;
  spacing: Record<string, string>;
}
