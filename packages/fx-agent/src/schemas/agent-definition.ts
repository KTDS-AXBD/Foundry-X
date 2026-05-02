import { z } from "@hono/zod-openapi";

// ─── F221: Agent-as-Code Schemas ───

export const CustomizationFieldSchema = z.object({
  type: z.enum(["string", "number", "boolean", "array"]),
  default: z.unknown(),
  enum: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  items: z.object({ type: z.string() }).optional(),
});

export const MenuItemSchema = z.object({
  action: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
});

export const AgentDefinitionSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    persona: z.string().max(10000).optional(),
    systemPrompt: z.string().min(1).max(10000),
    allowedTools: z.array(z.string().max(100)).max(50).optional(),
    preferredModel: z.string().nullable().optional(),
    preferredRunnerType: z.enum(["openrouter", "claude-api", "mcp", "mock"]).optional(),
    taskType: z.string().max(100).optional(),
    dependencies: z.array(z.string().max(100)).max(50).optional(),
    customization: z.record(CustomizationFieldSchema).optional(),
    menu: z.array(MenuItemSchema).max(20).optional(),
  })
  .openapi("AgentDefinition");

export const ImportAgentDefinitionSchema = z
  .object({
    content: z.string().min(1).max(100_000).describe("YAML 또는 JSON 문자열"),
    format: z.enum(["yaml", "json"]).default("yaml"),
    orgId: z.string().max(200).optional(),
  })
  .openapi("ImportAgentDefinition");

export const ExportFormatSchema = z.object({
  format: z.enum(["yaml", "json"]).optional().default("yaml"),
});

export const AgentDefinitionResponseSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    persona: z.string(),
    systemPrompt: z.string(),
    allowedTools: z.array(z.string()),
    preferredModel: z.string().nullable(),
    preferredRunnerType: z.string(),
    taskType: z.string(),
    dependencies: z.array(z.string()),
    customizationSchema: z.record(z.unknown()),
    menuConfig: z.array(MenuItemSchema),
    orgId: z.string(),
    isBuiltin: z.boolean(),
    enabled: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("AgentDefinitionResponse");
