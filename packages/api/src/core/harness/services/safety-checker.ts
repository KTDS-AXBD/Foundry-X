/**
 * F275: SafetyChecker — 스킬 프롬프트 안전성 검사 (100점 감점제)
 */

import type { SafetyCheckResult, SafetyViolation, SkillSafetyGrade } from "@foundry-x/shared";

interface SafetyRule {
  name: string;
  description: string;
  severity: number;
  pattern: RegExp;
}

const SAFETY_RULES: SafetyRule[] = [
  {
    name: "prompt-injection",
    description: "프롬프트 인젝션 패턴 탐지 (system/user 경계 위반)",
    severity: 20,
    pattern: /ignore\s+(previous|above)\s+instructions|system:\s*you\s+are|<\/?system>|<\/?user>/i,
  },
  {
    name: "external-url",
    description: "외부 URL/API 호출 참조",
    severity: 15,
    pattern: /https?:\/\/|fetch\(|axios\.|curl\s/i,
  },
  {
    name: "filesystem-access",
    description: "파일시스템 접근 패턴",
    severity: 15,
    pattern: /\bfs\.|readFile|writeFile|__dirname|process\.cwd/i,
  },
  {
    name: "env-secrets",
    description: "환경변수/시크릿 참조",
    severity: 20,
    pattern: /process\.env|SECRET|PASSWORD|API_KEY|TOKEN/i,
  },
  {
    name: "code-execution",
    description: "코드 실행 패턴 (eval, exec)",
    severity: 20,
    pattern: /\beval\(|\bexec\(|Function\(|child_process/i,
  },
  {
    name: "infinite-loop",
    description: "무한 루프/재귀 위험 패턴",
    severity: 10,
    pattern: /while\s*\(\s*true|for\s*\(\s*;\s*;|recursion.*infinite/i,
  },
];

function scoreToGrade(score: number): SkillSafetyGrade {
  if (score >= 90) return "A";
  if (score >= 70) return "B";
  if (score >= 50) return "C";
  if (score >= 30) return "D";
  return "F";
}

export class SafetyChecker {
  static check(promptTemplate: string): SafetyCheckResult {
    const violations: SafetyViolation[] = [];
    let score = 100;

    for (const rule of SAFETY_RULES) {
      const match = rule.pattern.exec(promptTemplate);
      if (match) {
        score -= rule.severity;
        violations.push({
          rule: rule.name,
          description: rule.description,
          severity: rule.severity,
          matchedPattern: match[0],
        });
      }
    }

    score = Math.max(0, score);

    return {
      score,
      grade: scoreToGrade(score),
      violations,
      checkedAt: new Date().toISOString(),
    };
  }

  static getRules(): { name: string; description: string; severity: number }[] {
    return SAFETY_RULES.map((r) => ({
      name: r.name,
      description: r.description,
      severity: r.severity,
    }));
  }
}
