/**
 * HybridSrClassifier — 규칙 기반 + LLM 폴백 하이브리드 SR 분류기
 * F167 ML 하이브리드 SR 분류기
 */
import { SrClassifier, type ClassificationResult } from "./sr-classifier.js";
import { LLMService } from "../../infra/types.js";
import type { SrType } from "../schemas/sr.js";

export interface HybridClassificationResult extends ClassificationResult {
  method: "rule" | "llm" | "hybrid";
  llmConfidence?: number;
  ruleConfidence: number;
}

const VALID_SR_TYPES: SrType[] = ["code_change", "bug_fix", "env_config", "doc_update", "security_patch"];
const CONFIDENCE_THRESHOLD = 0.7;
const RULE_WEIGHT = 0.4;
const LLM_WEIGHT = 0.6;

const SR_CLASSIFICATION_SYSTEM_PROMPT = `You are an SR (Service Request) classifier for IT operations.
Classify the given SR into exactly one type and provide a confidence score.

Types:
- code_change: New feature, API addition, code modification
- bug_fix: Bug report, error fix, crash resolution
- env_config: Environment setup, infrastructure, deployment config
- doc_update: Documentation update, guide modification
- security_patch: Security vulnerability, CVE patch, XSS/CSRF fix

OUTPUT FORMAT (JSON only, no markdown wrapping):
{"srType": "<type>", "confidence": <0.0-1.0>}`;

export function validateSrType(type: string): type is SrType {
  return VALID_SR_TYPES.includes(type as SrType);
}

export function extractJson(text: string): { srType?: string; confidence?: number } | null {
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting from markdown code block
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]!.trim());
      } catch {
        // fall through
      }
    }
    // Try extracting bare JSON object
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // fall through
      }
    }
    return null;
  }
}

function mergeResults(
  ruleResult: ClassificationResult,
  llmType: SrType,
  llmConfidence: number,
): HybridClassificationResult {
  if (ruleResult.srType === llmType) {
    // Same type: weighted average confidence
    const mergedConfidence = Math.round(
      (ruleResult.confidence * RULE_WEIGHT + llmConfidence * LLM_WEIGHT) * 100,
    ) / 100;
    return {
      srType: ruleResult.srType,
      confidence: mergedConfidence,
      matchedKeywords: ruleResult.matchedKeywords,
      suggestedWorkflow: ruleResult.suggestedWorkflow,
      method: "hybrid",
      llmConfidence,
      ruleConfidence: ruleResult.confidence,
    };
  }

  // Different types: pick higher confidence
  if (llmConfidence > ruleResult.confidence) {
    return {
      srType: llmType,
      confidence: llmConfidence,
      matchedKeywords: ruleResult.matchedKeywords,
      suggestedWorkflow: `sr-${llmType.replace(/_/g, "-")}`,
      method: "llm",
      llmConfidence,
      ruleConfidence: ruleResult.confidence,
    };
  }

  return {
    ...ruleResult,
    method: "rule",
    llmConfidence,
    ruleConfidence: ruleResult.confidence,
  };
}

export class HybridSrClassifier {
  private ruleClassifier: SrClassifier;
  private llmService: LLMService;
  private threshold: number;

  constructor(llmService: LLMService, threshold = CONFIDENCE_THRESHOLD) {
    this.ruleClassifier = new SrClassifier();
    this.llmService = llmService;
    this.threshold = threshold;
  }

  async classify(title: string, description: string): Promise<HybridClassificationResult> {
    // Phase 1: Rule-based classification
    const ruleResult = this.ruleClassifier.classify(title, description);

    // If high confidence, skip LLM
    if (ruleResult.confidence >= this.threshold) {
      return {
        ...ruleResult,
        method: "rule",
        ruleConfidence: ruleResult.confidence,
      };
    }

    // Phase 2: LLM fallback
    try {
      const userPrompt = `Classify this SR:\nTitle: ${title}\nDescription: ${description || "N/A"}`;
      const response = await this.llmService.generate(SR_CLASSIFICATION_SYSTEM_PROMPT, userPrompt);
      const parsed = extractJson(response.content);

      if (parsed?.srType && typeof parsed.confidence === "number" && validateSrType(parsed.srType)) {
        // Phase 3: Merge results
        return mergeResults(ruleResult, parsed.srType, parsed.confidence);
      }
    } catch {
      // LLM failure: graceful fallback to rule result
    }

    // Fallback to rule result
    return {
      ...ruleResult,
      method: "rule",
      ruleConfidence: ruleResult.confidence,
    };
  }
}
