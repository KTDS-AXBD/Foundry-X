#!/usr/bin/env tsx
// F218: Agent SDK Test Agent PoC — 진입점
//
// Usage:
//   ANTHROPIC_API_KEY=sk-... pnpm poc -- <target-file>
//   예: pnpm poc -- packages/api/src/services/config-service.ts

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { PocConfig, TestResult } from "./types.js";
import { timer, saveResult, ensureDir } from "./utils.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const POC_ROOT = resolve(__dirname, "..");
const PROJECT_ROOT = resolve(POC_ROOT, "../..");

// ── Subagent 프롬프트 로딩 ──────────────────────────────

function loadAgentPrompt(name: string): string {
  return readFileSync(resolve(__dirname, "agents", `${name}.md`), "utf-8");
}

// ── Agent SDK 기반 Test Agent 실행 ──────────────────────

export async function runAgentSDKTestAgent(config: PocConfig): Promise<TestResult> {
  const { targetFile, projectRoot, outputDir } = config;
  const clock = timer();

  console.log(`\n🤖 Agent SDK Test Agent 시작: ${targetFile}`);
  console.log(`   프로젝트: ${projectRoot}`);
  console.log(`   출력: ${outputDir}\n`);

  const collectedOutput: string[] = [];
  let toolUseCount = 0;

  const prompt = [
    `## Task`,
    `\`${targetFile}\` 파일에 대한 vitest 단위 테스트를 작성하고 실행해줘.`,
    ``,
    `## 절차`,
    `1. test-writer 에이전트를 사용하여 테스트 파일을 작성해.`,
    `2. test-runner 에이전트를 사용하여 테스트를 실행하고 실패를 수정해.`,
    `3. test-reviewer 에이전트를 사용하여 테스트 품질을 리뷰해.`,
    ``,
    `## 규칙`,
    `- vitest 3.x + TypeScript 패턴 사용`,
    `- describe/it 구조, arrange-act-assert 패턴`,
    `- 엣지케이스 (null, boundary, error) 최소 3개 이상 포함`,
    `- 기존 테스트 참고: packages/api/src/__tests/ 또는 packages/cli/src/__tests/`,
    ``,
    `## 최종 출력`,
    `모든 작업 완료 후 다음 JSON을 출력해:`,
    `\`\`\`json`,
    `{`,
    `  "generatedFiles": ["생성된 테스트 파일 경로"],`,
    `  "testCount": 생성된_테스트_수,`,
    `  "edgeCaseCount": 엣지케이스_수,`,
    `  "passRate": 통과율_0_to_1,`,
    `  "reviewScore": 품질점수_1_to_10`,
    `}`,
    `\`\`\``,
  ].join("\n");

  try {
    for await (const message of query({
      prompt,
      options: {
        allowedTools: [
          "Read", "Write", "Edit", "Bash", "Glob", "Grep", "Agent",
        ],
        permissionMode: "acceptEdits",
        cwd: projectRoot,
        agents: {
          "test-writer": {
            description:
              "vitest 테스트 코드 작성 전문가. 소스 파일을 분석하여 누락된 테스트를 작성한다.",
            prompt: loadAgentPrompt("test-writer"),
            tools: ["Read", "Write", "Glob", "Grep"],
          },
          "test-runner": {
            description:
              "테스트 실행 및 실패 수정 전문가. Bash로 vitest를 실행하고 실패를 자동 수정한다.",
            prompt: loadAgentPrompt("test-runner"),
            tools: ["Read", "Edit", "Bash"],
          },
          "test-reviewer": {
            description:
              "테스트 품질 리뷰 전문가 (읽기 전용). 커버리지와 품질을 평가한다.",
            prompt: loadAgentPrompt("test-reviewer"),
            tools: ["Read", "Glob", "Grep"],
          },
        },
      },
    })) {
      // 메시지 스트림 처리
      if ("result" in message) {
        collectedOutput.push(String(message.result));
      }
      if ("type" in message && message.type === "tool_use") {
        toolUseCount++;
      }
    }
  } catch (error) {
    console.error("❌ Agent SDK 실행 오류:", error);
    return {
      approach: "agent-sdk",
      testCount: 0,
      edgeCaseCount: 0,
      passRate: 0,
      duration: clock.elapsed(),
      cost: 0,
      generatedFiles: [],
      rawOutput: String(error),
    };
  }

  const duration = clock.elapsed();
  const output = collectedOutput.join("\n");

  // 결과 JSON 파싱 시도
  const jsonMatch = output.match(/```json\s*([\s\S]*?)```/);
  let parsed = {
    generatedFiles: [] as string[],
    testCount: 0,
    edgeCaseCount: 0,
    passRate: 0,
    reviewScore: 0,
  };

  if (jsonMatch?.[1]) {
    try {
      parsed = JSON.parse(jsonMatch[1].trim());
    } catch {
      console.warn("⚠️ 결과 JSON 파싱 실패 — 수동 확인 필요");
    }
  }

  // 비용 추정: 도구 호출 횟수 기반 대략 추정
  const estimatedCost = toolUseCount * 0.02; // ~$0.02 per tool call (rough estimate)

  const result: TestResult = {
    approach: "agent-sdk",
    testCount: parsed.testCount,
    edgeCaseCount: parsed.edgeCaseCount,
    passRate: parsed.passRate,
    duration,
    cost: estimatedCost,
    generatedFiles: parsed.generatedFiles,
    reviewScore: parsed.reviewScore,
    rawOutput: output,
  };

  // 결과 저장
  saveResult(outputDir, "agent-sdk-result.json", result);
  console.log(`\n✅ Agent SDK 완료: ${duration}ms, ${parsed.testCount} tests`);

  return result;
}

// ── CLI 진입점 ──────────────────────────────────────────

async function main() {
  const targetFile = process.argv[2];
  if (!targetFile) {
    console.error("Usage: pnpm poc -- <target-file>");
    console.error("  예: pnpm poc -- packages/api/src/services/config-service.ts");
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ ANTHROPIC_API_KEY 환경변수가 설정되지 않았어요.");
    console.error("   export ANTHROPIC_API_KEY=sk-ant-...");
    process.exit(1);
  }

  const config: PocConfig = {
    targetFile,
    projectRoot: PROJECT_ROOT,
    outputDir: resolve(POC_ROOT, "results"),
  };

  ensureDir(config.outputDir);

  const result = await runAgentSDKTestAgent(config);

  console.log("\n📊 결과 요약:");
  console.log(`   테스트 수: ${result.testCount}`);
  console.log(`   엣지케이스: ${result.edgeCaseCount}`);
  console.log(`   통과율: ${(result.passRate * 100).toFixed(1)}%`);
  console.log(`   소요 시간: ${result.duration}ms`);
  console.log(`   추정 비용: $${result.cost.toFixed(2)}`);
  console.log(`   생성 파일: ${result.generatedFiles.join(", ") || "없음"}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
