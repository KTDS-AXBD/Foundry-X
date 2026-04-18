import { z } from "zod";

export const CreateBdpVersionSchema = z.object({
  content: z.string().min(1).max(100_000),
});

export const BdpDiffParamsSchema = z.object({
  v1: z.coerce.number().int().min(1),
  v2: z.coerce.number().int().min(1),
});

export const GenerateProposalSchema = z.object({
  maxLength: z.coerce.number().int().min(100).max(5000).default(1500),
});
