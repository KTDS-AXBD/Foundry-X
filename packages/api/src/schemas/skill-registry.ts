import { z } from "zod";

export const registerSkillSchema = z.object({
  skillId: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z
    .enum(["general", "bd-process", "analysis", "generation", "validation", "integration"])
    .default("general"),
  tags: z.array(z.string()).max(20).optional(),
  sourceType: z.enum(["marketplace", "custom", "derived", "captured"]).default("marketplace"),
  sourceRef: z.string().optional(),
  promptTemplate: z.string().max(50000).optional(),
  modelPreference: z.string().optional(),
  maxTokens: z.number().int().min(1).max(200000).optional(),
});

export const updateSkillSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z
    .enum(["general", "bd-process", "analysis", "generation", "validation", "integration"])
    .optional(),
  tags: z.array(z.string()).max(20).optional(),
  status: z.enum(["active", "deprecated", "draft", "archived"]).optional(),
  promptTemplate: z.string().max(50000).optional(),
  modelPreference: z.string().optional(),
  maxTokens: z.number().int().min(1).max(200000).optional(),
});

export const listSkillsQuerySchema = z.object({
  category: z
    .enum(["general", "bd-process", "analysis", "generation", "validation", "integration"])
    .optional(),
  status: z.enum(["active", "deprecated", "draft", "archived"]).optional(),
  safetyGrade: z.enum(["A", "B", "C", "D", "F", "pending"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const searchSkillsSchema = z.object({
  q: z.string().min(1).max(200),
  category: z
    .enum(["general", "bd-process", "analysis", "generation", "validation", "integration"])
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const bulkRegisterSkillSchema = z.object({
  skills: z.array(
    z.object({
      skillId: z.string().min(1).max(100),
      name: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      category: z
        .enum(["general", "bd-process", "analysis", "generation", "validation", "integration"])
        .default("general"),
      tags: z.array(z.string()).max(20).optional(),
      sourceType: z.enum(["marketplace", "custom", "derived", "captured"]).default("marketplace"),
      sourceRef: z.string().optional(),
    }),
  ).min(1).max(500),
});

export type RegisterSkillInput = z.infer<typeof registerSkillSchema>;
export type UpdateSkillInput = z.infer<typeof updateSkillSchema>;
export type ListSkillsQuery = z.infer<typeof listSkillsQuerySchema>;
export type SearchSkillsQuery = z.infer<typeof searchSkillsSchema>;
export type BulkRegisterSkillInput = z.infer<typeof bulkRegisterSkillSchema>;
