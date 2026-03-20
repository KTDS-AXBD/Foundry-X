import { z } from "@hono/zod-openapi";

export const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.enum(["trigger", "action", "condition", "end"]),
  label: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.object({
    actionType: z
      .enum(["run_agent", "create_pr", "send_notification", "run_analysis", "wait_approval"])
      .optional(),
    config: z.record(z.unknown()).optional(),
  }),
});

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  condition: z.string().optional(),
});

export const workflowDefinitionSchema = z.object({
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
});

export const workflowCreateSchema = z
  .object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    definition: workflowDefinitionSchema,
    template_id: z.string().optional(),
  })
  .openapi("WorkflowCreate");

export const workflowExecuteSchema = z
  .object({
    context: z.record(z.unknown()).optional(),
  })
  .openapi("WorkflowExecute");

export const workflowResponseSchema = z
  .object({
    id: z.string(),
    org_id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    definition: workflowDefinitionSchema,
    template_id: z.string().nullable(),
    enabled: z.boolean(),
    created_by: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .openapi("WorkflowResponse");

export const workflowExecutionResponseSchema = z
  .object({
    id: z.string(),
    workflow_id: z.string(),
    org_id: z.string(),
    status: z.string(),
    current_step: z.string().nullable(),
    context: z.record(z.unknown()).nullable(),
    result: z.record(z.unknown()).nullable(),
    error: z.string().nullable(),
    started_at: z.string().nullable(),
    completed_at: z.string().nullable(),
    created_at: z.string(),
  })
  .openapi("WorkflowExecutionResponse");

export type WorkflowCreate = z.infer<typeof workflowCreateSchema>;
export type WorkflowNode = z.infer<typeof workflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;
