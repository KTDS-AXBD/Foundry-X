// F218: Agent SDK Test Agent PoC — 헬퍼 함수

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ComparisonReport, TestResult, MetricComparison, EVALUATION_WEIGHTS } from "./types.js";

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function saveResult(outputDir: string, filename: string, data: unknown): string {
  ensureDir(outputDir);
  const filepath = join(outputDir, filename);
  writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
  return filepath;
}

export function timer() {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
  };
}

export function compareMetric(
  name: string,
  weight: number,
  f139Value: number,
  sdkValue: number,
  higherIsBetter: boolean,
): MetricComparison {
  let winner: "f139" | "agent-sdk" | "tie";
  if (f139Value === sdkValue) {
    winner = "tie";
  } else if (higherIsBetter) {
    winner = f139Value > sdkValue ? "f139" : "agent-sdk";
  } else {
    winner = f139Value < sdkValue ? "f139" : "agent-sdk";
  }
  return { name, weight, f139Value, sdkValue, winner };
}

export function generateReport(f139: TestResult, sdk: TestResult): ComparisonReport {
  const metrics: MetricComparison[] = [
    compareMetric("testCount", 0.2, f139.testCount, sdk.testCount, true),
    compareMetric("edgeCaseCount", 0.25, f139.edgeCaseCount, sdk.edgeCaseCount, true),
    compareMetric("passRate", 0.25, f139.passRate, sdk.passRate, true),
    compareMetric("duration", 0.15, f139.duration, sdk.duration, false),
    compareMetric("cost", 0.15, f139.cost, sdk.cost, false),
  ];

  // 가중 점수 계산
  let f139Score = 0;
  let sdkScore = 0;
  for (const m of metrics) {
    if (m.winner === "f139") f139Score += m.weight;
    else if (m.winner === "agent-sdk") sdkScore += m.weight;
    else {
      f139Score += m.weight / 2;
      sdkScore += m.weight / 2;
    }
  }

  const winner = f139Score > sdkScore ? "f139" : sdkScore > f139Score ? "agent-sdk" : "tie";

  let recommendation: string;
  if (winner === "agent-sdk" && metrics.filter((m) => m.winner === "agent-sdk").length >= 3) {
    recommendation = "Agent SDK가 3개 이상 항목에서 우위 → F219를 Strategy C (Subagent)로 진행 권장";
  } else if (winner === "f139") {
    recommendation = "F139 TestAgent가 우위 → F219를 Strategy D (Superpowers)로 전환 검토";
  } else {
    recommendation = "동등 수준 → 비용/통합 난이도 기반으로 최종 판단 필요";
  }

  if (sdk.cost > 5) {
    recommendation += " [경고] Agent SDK 비용 $5 초과 — 비용 최적화 후 재평가 필요";
  }

  return {
    timestamp: new Date().toISOString(),
    target: f139.approach === "f139" ? "비교 완료" : "비교 완료",
    results: [f139, sdk],
    winner: winner as "f139" | "agent-sdk" | "tie",
    recommendation,
    metrics,
  };
}

export function formatReportMarkdown(report: ComparisonReport): string {
  const lines: string[] = [
    `## 비교 결과 (${report.timestamp})`,
    "",
    "| 항목 | 가중치 | F139 TestAgent | Agent SDK | 승자 |",
    "|------|--------|---------------|-----------|------|",
  ];

  for (const m of report.metrics) {
    const winnerLabel = m.winner === "tie" ? "동등" : m.winner === "f139" ? "F139" : "SDK";
    lines.push(`| ${m.name} | ${(m.weight * 100).toFixed(0)}% | ${m.f139Value} | ${m.sdkValue} | ${winnerLabel} |`);
  }

  lines.push("");
  lines.push(`**종합 판정:** ${report.winner === "tie" ? "동등" : report.winner === "f139" ? "F139 우위" : "Agent SDK 우위"}`);
  lines.push("");
  lines.push(`**권장:** ${report.recommendation}`);

  return lines.join("\n");
}
