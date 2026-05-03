import { z } from "@hono/zod-openapi";

// ─── Skill Guide ───

export const SkillGuideResponseSchema = z
  .object({
    orchestrator: z.object({
      name: z.string(),
      description: z.string(),
      commands: z.array(z.object({ command: z.string(), description: z.string() })),
      stages: z.array(z.object({ id: z.string(), name: z.string(), description: z.string() })),
    }),
    skills: z.array(
      z.object({
        name: z.string(),
        displayName: z.string(),
        description: z.string(),
        category: z.string(),
        triggers: z.array(z.string()),
        frameworks: z.array(z.string()),
      }),
    ),
  })
  .openapi("SkillGuideResponse");

// ─── Process Flow ───

export const ProcessFlowResponseSchema = z
  .object({
    lifecycle: z.array(
      z.object({
        stage: z.number(),
        name: z.string(),
        description: z.string(),
        tools: z.array(z.string()),
      }),
    ),
    discovery: z.object({
      types: z.array(
        z.object({
          code: z.string(),
          name: z.string(),
          description: z.string(),
          icon: z.string(),
        }),
      ),
      stages: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          coreFor: z.array(z.string()),
          normalFor: z.array(z.string()),
          lightFor: z.array(z.string()),
        }),
      ),
      commitGate: z.object({
        stage: z.string(),
        questions: z.array(z.string()),
      }),
    }),
  })
  .openapi("ProcessFlowResponse");

// ─── Team FAQ ───

export const TeamFaqResponseSchema = z
  .object({
    categories: z.array(z.string()),
    items: z.array(
      z.object({
        id: z.string(),
        category: z.string(),
        question: z.string(),
        answer: z.string(),
      }),
    ),
  })
  .openapi("TeamFaqResponse");
