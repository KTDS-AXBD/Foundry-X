/**
 * Sprint 220 F455: PRD 인터뷰 Zod 스키마
 */

import { z } from "@hono/zod-openapi";

export const StartInterviewSchema = z.object({
  prdId: z.string().optional(),
}).openapi("StartInterview");

export const AnswerInterviewSchema = z.object({
  interviewId: z.string(),
  seq: z.number().int().min(1),
  answer: z.string().min(1),
}).openapi("AnswerInterview");
