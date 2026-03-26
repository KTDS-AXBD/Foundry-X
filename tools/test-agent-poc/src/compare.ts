#!/usr/bin/env tsx
// F218: Agent SDK Test Agent PoC — F139 vs Agent SDK 비교 스크립트
//
// Usage:
//   ANTHROPIC_API_KEY=sk-... pnpm compare -- <target-file> [--api-url=URL]
//   예: pnpm compare -- packages/api/src/services/config-service.ts

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { PocConfig, TestResult } from "./types.js";
import { timer, saveResult, generateReport, formatReportMarkdown } from "./utils.js";
import { runAgentSDKTestAgent } from "./index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const POC_ROOT = resolve(__dirname, "..");
const PROJECT_ROOT = resolve(POC_ROOT, "../..");

// ── F139 TestAgent API 호출 ─────────────────────────────

async function runF139TestAgent(config: PocConfig): Promise<TestResult> {
  const { targetFile, apiUrl, outputDir } = config;
  const clock = timer();

  const baseUrl = apiUrl || "https://foundry-x-api.ktds-axbd.workers.dev/api";
  console.log(`\n🔧 F139 TestAgent 시작: ${targetFile}`);
  console.log(`   API: ${baseUrl}`);

  try {
    // 소스 코드 읽기
    const sourceCode = await import("node:fs").then((fs) =>
      fs.readFileSync(resolve(PROJECT_ROOT, targetFile), "utf-8"),
    );

    // F139 TestAgent API 호출 — POST /agents/test/generate
    const response = await fetch(`${baseUrl}/agents/test/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FOUNDRY_X_TOKEN || "poc-token"}`,
      },
      body: JSON.stringify({
        sourceCode,
        fileName: targetFile,
        framework: "vitest",
        options: {
          includeEdgeCases: true,
          maxTests: 20,
        },
      }),
    });

    if (!response.ok) {
      console.warn(`⚠️ F139 API 응답 오류: ${response.status} ${response.statusText}`);
      // API 접근 불가 시 목업 데이터 반환
      return createMockF139Result(targetFile, clock.elapsed(), outputDir);
    }

    const data = (await response.json()) as {
      testFiles?: Array<{ path: string; testCount: number }>;
      totalTestCount?: number;
      edgeCases?: Array<unknown>;
      tokensUsed?: number;
    };

    const duration = clock.elapsed();
    const result: TestResult = {
      approach: "f139",
      testCount: data.totalTestCount || 0,
      edgeCaseCount: data.edgeCases?.length || 0,
      passRate: 0, // F139는 실행 불가 — 코드만 반환
      duration,
      cost: (data.tokensUsed || 0) * 0.000003, // Claude input token cost estimate
      generatedFiles: data.testFiles?.map((f) => f.path) || [],
    };

    saveResult(outputDir, "f139-result.json", result);
    console.log(`✅ F139 완료: ${duration}ms, ${result.testCount} tests`);
    return result;
  } catch (error) {
    console.warn(`⚠️ F139 API 호출 실패: ${error}`);
    return createMockF139Result(targetFile, clock.elapsed(), outputDir);
  }
}

function createMockF139Result(
  targetFile: string,
  duration: number,
  outputDir: string,
): TestResult {
  console.log("   → 목업 데이터로 비교 진행 (API 미접근)");

  // 기존 F139 TestAgent의 평균 성능 데이터 (FX-ANLS-015 기반)
  const result: TestResult = {
    approach: "f139",
    testCount: 8, // 평균 생성 테스트 수
    edgeCaseCount: 3, // 평균 엣지케이스
    passRate: 0, // 실행 불가 (코드만 반환)
    duration: duration || 5000, // 평균 5초
    cost: 0.015, // 평균 API 비용
    generatedFiles: [],
    rawOutput: "[Mock] F139 TestAgent — API 미접근, 평균 성능 데이터 사용",
  };

  saveResult(outputDir, "f139-result.json", result);
  return result;
}

// ── CLI 진입점 ──────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const targetFile = args.find((a) => !a.startsWith("--"));
  const apiUrlArg = args.find((a) => a.startsWith("--api-url="));
  const apiUrl = apiUrlArg?.split("=")[1];

  if (!targetFile) {
    console.error("Usage: pnpm compare -- <target-file> [--api-url=URL]");
    process.exit(1);
  }

  const config: PocConfig = {
    targetFile,
    projectRoot: PROJECT_ROOT,
    outputDir: resolve(POC_ROOT, "results"),
    apiUrl,
  };

  console.log("═══════════════════════════════════════════════");
  console.log(" F218: F139 TestAgent vs Agent SDK 비교 평가");
  console.log("═══════════════════════════════════════════════");
  console.log(`대상: ${targetFile}\n`);

  // 1. F139 TestAgent 실행
  const f139Result = await runF139TestAgent(config);

  // 2. Agent SDK Test Agent 실행
  let sdkResult: TestResult;
  if (process.env.ANTHROPIC_API_KEY) {
    sdkResult = await runAgentSDKTestAgent(config);
  } else {
    console.warn("\n⚠️ ANTHROPIC_API_KEY 미설정 — Agent SDK 목업으로 비교");
    sdkResult = {
      approach: "agent-sdk",
      testCount: 0,
      edgeCaseCount: 0,
      passRate: 0,
      duration: 0,
      cost: 0,
      generatedFiles: [],
      rawOutput: "[Skip] ANTHROPIC_API_KEY 미설정",
    };
  }

  // 3. 비교 리포트 생성
  const report = generateReport(f139Result, sdkResult);
  const markdown = formatReportMarkdown(report);

  saveResult(config.outputDir, "comparison-report.json", report);
  console.log("\n" + "═".repeat(50));
  console.log(markdown);
  console.log("═".repeat(50));

  const reportPath = saveResult(
    config.outputDir,
    "comparison-report.json",
    report,
  );
  console.log(`\n📄 리포트 저장: ${reportPath}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
