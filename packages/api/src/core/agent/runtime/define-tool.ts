// ─── F527: F-L2-1 defineTool() 유틸리티 (Sprint 280) ───

import type { ToolCategory } from "@foundry-x/shared";
import { z } from "zod";

export interface ToolExecutionContext {
  agentId: string;
  sessionId: string;
  db?: unknown;
}

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;
  category: ToolCategory;
  permissions?: string[];
  execute: (input: TInput, ctx: ToolExecutionContext) => Promise<TOutput>;
}

/**
 * 도구를 선언적으로 정의한다. Strands SDK의 `@tool` 패턴을 TS-first로 구현.
 *
 * @example
 * const readFile = defineTool({
 *   name: 'read_file',
 *   description: 'Reads a file from disk',
 *   inputSchema: z.object({ path: z.string() }),
 *   category: 'builtin',
 *   execute: async ({ path }) => fs.readFileSync(path, 'utf-8'),
 * });
 */
export function defineTool<TInput = unknown, TOutput = unknown>(
  def: ToolDefinition<TInput, TOutput>,
): ToolDefinition<TInput, TOutput> {
  if (!def.name || def.name.trim() === "") {
    throw new Error("Tool name is required");
  }
  if (!def.description || def.description.trim() === "") {
    throw new Error("Tool description is required");
  }
  return def;
}

/** 도구의 inputSchema를 Anthropic API JSON Schema 포맷으로 변환 */
export function toJsonSchema(zodSchema: z.ZodType): Record<string, unknown> {
  // Zod의 shape에서 JSON Schema 추출 (object type만 지원)
  if (zodSchema instanceof z.ZodObject) {
    const shape = zodSchema.shape as Record<string, z.ZodType>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, fieldSchema] of Object.entries(shape)) {
      properties[key] = zodTypeToJsonSchema(fieldSchema);
      if (!(fieldSchema instanceof z.ZodOptional)) {
        required.push(key);
      }
    }

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  return { type: "object", properties: {} };
}

function zodTypeToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  if (schema instanceof z.ZodString) return { type: "string" };
  if (schema instanceof z.ZodNumber) return { type: "number" };
  if (schema instanceof z.ZodBoolean) return { type: "boolean" };
  if (schema instanceof z.ZodArray) {
    return { type: "array", items: zodTypeToJsonSchema(schema.element) };
  }
  if (schema instanceof z.ZodOptional) {
    return zodTypeToJsonSchema(schema.unwrap());
  }
  if (schema instanceof z.ZodObject) {
    return toJsonSchema(schema);
  }
  return { type: "string" };
}
