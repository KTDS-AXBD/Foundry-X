/**
 * SrClassifier — SR 텍스트를 규칙 기반으로 5종 유형으로 자동 분류
 * F116 KT DS SR 시나리오 구체화
 */
import type { SrType } from "../schemas/sr.js";

export interface ClassificationResult {
  srType: SrType;
  confidence: number;
  matchedKeywords: string[];
  suggestedWorkflow: string;
}

interface SrTypeRule {
  type: SrType;
  keywords: string[];
  patterns: RegExp[];
  priority: number;
  baseConfidence: number;
}

const SR_TYPE_RULES: SrTypeRule[] = [
  {
    type: "security_patch",
    keywords: ["보안", "취약점", "cve", "패치", "xss", "csrf", "injection", "vulnerability", "security"],
    patterns: [/CVE-\d{4}-\d+/i, /OWASP/i, /보안\s*패치/],
    priority: 100,
    baseConfidence: 0.85,
  },
  {
    type: "bug_fix",
    keywords: ["버그", "에러", "오류", "수정", "fix", "bug", "error", "500", "404", "크래시", "장애"],
    patterns: [/HTTP\s*[45]\d{2}/, /긴급\s*수정/, /핫픽스/i],
    priority: 90,
    baseConfidence: 0.8,
  },
  {
    type: "env_config",
    keywords: ["환경", "설정", "인프라", "배포", "config", "env", "서버", "스케일", "워커"],
    patterns: [/환경\s*변수/, /배포\s*설정/, /인프라\s*변경/],
    priority: 70,
    baseConfidence: 0.75,
  },
  {
    type: "doc_update",
    keywords: ["문서", "가이드", "api 문서", "readme", "매뉴얼", "doc", "documentation"],
    patterns: [/문서\s*갱신/, /가이드\s*수정/, /API\s*문서/],
    priority: 60,
    baseConfidence: 0.8,
  },
  {
    type: "code_change",
    keywords: ["기능", "추가", "구현", "개발", "feature", "api", "엔드포인트", "변경"],
    patterns: [/신규\s*기능/, /기능\s*추가/, /API\s*추가/],
    priority: 50,
    baseConfidence: 0.7,
  },
];

export class SrClassifier {
  classify(title: string, description: string): ClassificationResult {
    const text = `${title} ${description ?? ""}`.toLowerCase();
    let bestMatch: { rule: SrTypeRule; score: number; keywords: string[] } | null = null;

    for (const rule of SR_TYPE_RULES) {
      const matched = rule.keywords.filter((k) => text.includes(k.toLowerCase()));
      if (matched.length === 0) continue;
      let score = (matched.length / rule.keywords.length) * rule.priority;
      const patternMatches = rule.patterns.filter((p) => p.test(text));
      score += patternMatches.length * 10;
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { rule, score, keywords: matched };
      }
    }

    if (!bestMatch) {
      return { srType: "code_change", confidence: 0.5, matchedKeywords: [], suggestedWorkflow: "sr-code-change" };
    }

    const confidence = Math.min(
      bestMatch.rule.baseConfidence * (bestMatch.keywords.length / Math.max(bestMatch.rule.keywords.length, 1)),
      1.0,
    );
    return {
      srType: bestMatch.rule.type,
      confidence: Math.round(confidence * 100) / 100,
      matchedKeywords: bestMatch.keywords,
      suggestedWorkflow: `sr-${bestMatch.rule.type.replace(/_/g, "-")}`,
    };
  }
}
