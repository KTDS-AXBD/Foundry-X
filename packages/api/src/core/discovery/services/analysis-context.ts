/**
 * Sprint 53: 분석 컨텍스트 CRUD 서비스 (F184)
 */

import type { AnalysisPath, AnalysisStep } from "./analysis-paths.js";
import { getSkillGuide, type PmSkillGuide } from "../../../services/pm-skills-guide.js";

export interface AnalysisContext {
  id: string;
  bizItemId: string;
  stepOrder: number;
  pmSkill: string;
  inputSummary: string | null;
  outputText: string;
  createdAt: string;
}

export interface NextGuide {
  currentStep: number;
  nextStep: AnalysisStep | null;
  skillGuide: PmSkillGuide | null;
  previousContexts: AnalysisContext[];
  completedCriteria: number[];
  suggestedCriteria: number[];
  isLastStep: boolean;
}

interface AnalysisContextRow {
  id: string;
  biz_item_id: string;
  step_order: number;
  pm_skill: string;
  input_summary: string | null;
  output_text: string;
  created_at: string;
}

function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toAnalysisContext(row: AnalysisContextRow): AnalysisContext {
  return {
    id: row.id,
    bizItemId: row.biz_item_id,
    stepOrder: row.step_order,
    pmSkill: row.pm_skill,
    inputSummary: row.input_summary,
    outputText: row.output_text,
    createdAt: row.created_at,
  };
}

export class AnalysisContextService {
  constructor(private db: D1Database) {}

  async save(
    bizItemId: string,
    data: { stepOrder: number; pmSkill: string; inputSummary?: string; outputText: string },
  ): Promise<AnalysisContext> {
    const id = generateId();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO biz_analysis_contexts (id, biz_item_id, step_order, pm_skill, input_summary, output_text, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, bizItemId, data.stepOrder, data.pmSkill, data.inputSummary ?? null, data.outputText, now)
      .run();

    return {
      id,
      bizItemId,
      stepOrder: data.stepOrder,
      pmSkill: data.pmSkill,
      inputSummary: data.inputSummary ?? null,
      outputText: data.outputText,
      createdAt: now,
    };
  }

  async getAll(bizItemId: string): Promise<AnalysisContext[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM biz_analysis_contexts WHERE biz_item_id = ? ORDER BY step_order ASC")
      .bind(bizItemId)
      .all<AnalysisContextRow>();

    return results.map(toAnalysisContext);
  }

  async getUpToStep(bizItemId: string, stepOrder: number): Promise<AnalysisContext[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM biz_analysis_contexts WHERE biz_item_id = ? AND step_order <= ? ORDER BY step_order ASC")
      .bind(bizItemId, stepOrder)
      .all<AnalysisContextRow>();

    return results.map(toAnalysisContext);
  }

  async getNextGuide(bizItemId: string, analysisPath: AnalysisPath): Promise<NextGuide> {
    const contexts = await this.getAll(bizItemId);
    const lastStep = contexts.length > 0 ? Math.max(...contexts.map((c) => c.stepOrder)) : 0;
    const nextStepOrder = lastStep + 1;
    const nextStep = analysisPath.steps.find((s) => s.order === nextStepOrder) ?? null;
    const isLastStep = nextStep === null || nextStepOrder >= analysisPath.steps.length;

    // Collect completed criteria from all completed steps
    const completedCriteria: number[] = [];
    for (const ctx of contexts) {
      const step = analysisPath.steps.find((s) => s.order === ctx.stepOrder);
      if (step) {
        for (const cId of step.discoveryMapping) {
          if (!completedCriteria.includes(cId)) completedCriteria.push(cId);
        }
      }
    }

    // Suggested criteria for the next step
    const suggestedCriteria = nextStep
      ? nextStep.discoveryMapping.filter((cId) => !completedCriteria.includes(cId))
      : [];

    // Get skill guide for the next step
    const firstSkill = nextStep?.pmSkills[0];
    const skillGuide = firstSkill
      ? getSkillGuide(firstSkill) ?? null
      : null;

    return {
      currentStep: lastStep,
      nextStep,
      skillGuide,
      previousContexts: contexts,
      completedCriteria,
      suggestedCriteria,
      isLastStep,
    };
  }
}
