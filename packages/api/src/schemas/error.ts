import { z } from "@hono/zod-openapi";

// ─── Error code registry (F128) ───

export const ERROR_CODES = {
  // AUTH
  AUTH_001: "Token expired",
  AUTH_002: "Insufficient permissions",
  AUTH_003: "Invalid credentials",
  AUTH_004: "Email already registered",
  // VALIDATION
  VALIDATION_001: "Required field missing",
  VALIDATION_002: "Invalid format",
  // RESOURCE
  RESOURCE_001: "Not found",
  RESOURCE_002: "Already exists",
  // INTEGRATION
  INTEGRATION_001: "GitHub API failure",
  INTEGRATION_002: "Slack API failure",
  INTEGRATION_003: "LLM service unavailable",
  // INTERNAL
  INTERNAL_001: "Unexpected error",
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export const structuredErrorSchema = z
  .object({
    error: z.string().openapi({ example: "Token expired" }),
    errorCode: z.string().openapi({ example: "AUTH_001" }),
    details: z.unknown().optional(),
  })
  .openapi("StructuredErrorResponse");

/**
 * Backward-compatible error response helper.
 * Keeps `error` as a string for existing test compatibility,
 * adds `errorCode` for structured error identification.
 */
export function errorResponse(
  c: { json: (data: unknown, status: number) => Response },
  status: number,
  code: ErrorCode,
  message?: string,
  details?: unknown,
): Response {
  return c.json(
    {
      error: message ?? ERROR_CODES[code],
      errorCode: code,
      ...(details !== undefined ? { details } : {}),
    },
    status as StatusCode,
  );
}

type StatusCode = 200 | 201 | 400 | 401 | 403 | 404 | 409 | 410 | 422 | 500 | 503;
