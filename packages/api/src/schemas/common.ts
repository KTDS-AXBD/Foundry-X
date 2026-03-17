import { z } from "@hono/zod-openapi";

export const ErrorSchema = z
  .object({
    error: z.string(),
  })
  .openapi("ErrorResponse");

export const SuccessSchema = z
  .object({
    ok: z.boolean(),
    slug: z.string().optional(),
    filePath: z.string().optional(),
  })
  .openapi("SuccessResponse");

/**
 * Default validation hook — normalizes Zod errors to { error: "message" } format.
 * Used by OpenAPIHono instances that have request validation.
 */
export function validationHook(
  result: { success: boolean; error?: { issues: Array<{ message: string }> } },
  c: { json: (data: unknown, status: number) => Response },
): Response | void {
  if (!result.success) {
    return c.json(
      {
        error: result.error!.issues.map((i) => i.message).join(", "),
      },
      400,
    );
  }
}
