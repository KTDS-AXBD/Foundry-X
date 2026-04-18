// ─── F527: F-L2-2 AgentSpec YAML 파서 (Sprint 280) ───

import { z } from "zod";
import { MODEL_HAIKU, MODEL_SONNET } from "@foundry-x/shared";
import type { AgentSpec } from "@foundry-x/shared";

// Zod 스키마로 AgentSpec 검증
const agentSpecSchema = z.object({
  name: z.string().min(1, "name is required"),
  version: z.string().optional(),
  model: z.string().min(1, "model is required"),
  systemPrompt: z.string().min(1, "systemPrompt is required"),
  tools: z.array(z.string()).default([]),
  steering: z
    .object({
      rules: z.array(z.string()).default([]),
    })
    .optional(),
  evaluation: z
    .object({
      criteria: z.array(z.string()).default([]),
      minScore: z.number().optional(),
    })
    .optional(),
  constraints: z
    .object({
      maxTokens: z.number().optional(),
      maxRounds: z.number().optional(),
      timeoutMs: z.number().optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * YAML 문자열을 AgentSpec으로 파싱한다.
 *
 * 지원하는 YAML 서브셋:
 * - key: value (문자열, 숫자, 불리언)
 * - key: |<newline>  멀티라인 블록 스칼라
 * - key:<newline>  - item  (문자열 배열)
 * - 1단계 중첩 객체
 *
 * Workers 호환: 외부 YAML 라이브러리 없이 직접 파싱
 */
/** agent.yaml 내 모델 sentinel(@@MODEL_HAIKU@@, @@MODEL_SONNET@@)을 SSOT 상수로 치환 */
const MODEL_SENTINELS: Record<string, string> = {
  "@@MODEL_HAIKU@@": MODEL_HAIKU,
  "@@MODEL_SONNET@@": MODEL_SONNET,
};

function resolveModelSentinel(yaml: string): string {
  return yaml.replace(/@@MODEL_\w+@@/g, (token) => MODEL_SENTINELS[token] ?? token);
}

export function parseAgentSpec(yaml: string): AgentSpec {
  const raw = parseSimpleYaml(resolveModelSentinel(yaml));
  const result = agentSpecSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new Error(`Invalid AgentSpec: ${issues}`);
  }
  return result.data as AgentSpec;
}

/** 검증된 AgentSpec 객체를 반환 (이미 파싱된 객체용) */
export function validateAgentSpec(raw: unknown): AgentSpec {
  const result = agentSpecSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    throw new Error(`Invalid AgentSpec: ${issues}`);
  }
  return result.data as AgentSpec;
}

// ─── 경량 YAML 파서 ──────────────────────────────────────────────────────────

// TypeScript doesn't support direct recursive type aliases; use interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type YamlValue = string | number | boolean | string[] | Record<string, any>;
type YamlDoc = Record<string, YamlValue>;

function parseSimpleYaml(text: string): YamlDoc {
  const lines = text.split("\n");
  const result: YamlDoc = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line || line.trim() === "" || line.trim().startsWith("#")) {
      i++;
      continue;
    }

    // 최상위 키 감지 (들여쓰기 없음)
    const topKeyMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)/);
    if (!topKeyMatch || !topKeyMatch[1]) {
      i++;
      continue;
    }

    const key = topKeyMatch[1];
    const rest = topKeyMatch[2]?.trim() ?? "";

    // 멀티라인 블록 스칼라 (`|`)
    if (rest === "|") {
      i++;
      const blockLines: string[] = [];
      let baseIndent = -1;
      while (i < lines.length) {
        const blockLine = lines[i];
        if (blockLine === undefined || blockLine.trim() === "") {
          if (blockLines.length > 0) break;
          i++;
          continue;
        }
        const indent = blockLine.match(/^(\s+)/)?.[1]?.length ?? 0;
        if (baseIndent === -1) baseIndent = indent;
        if (indent < baseIndent && blockLine.trim() !== "") break;
        blockLines.push(blockLine.slice(baseIndent));
        i++;
      }
      result[key] = blockLines.join("\n").trimEnd();
      continue;
    }

    // 값이 없음 → 다음 줄이 배열이나 객체일 수 있음
    if (rest === "" || rest === null) {
      i++;
      // 들여쓰기된 다음 줄 수집
      const children: string[] = [];
      while (i < lines.length) {
        const child = lines[i];
        if (!child || child.trim() === "") { i++; break; }
        if (/^\S/.test(child)) break; // 들여쓰기 없음 → 다른 최상위 키
        children.push(child);
        i++;
      }

      if (children.length === 0) {
        result[key] = "";
        continue;
      }

      // 배열 항목인지 확인
      if (children[0]?.trim().startsWith("- ")) {
        result[key] = children
          .map((c) => c.trim())
          .filter((c) => c.startsWith("- "))
          .map((c) => c.slice(2).trim());
      } else {
        // 단순 key: value 객체 (1단계)
        const obj: Record<string, string | number | boolean> = {};
        for (const child of children) {
          const childMatch = child.trim().match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)/);
          if (childMatch?.[1]) {
            obj[childMatch[1]] = parseScalar(childMatch[2]?.trim() ?? "");
          }
        }
        result[key] = obj;
      }
      continue;
    }

    // 인라인 값
    result[key] = parseScalar(rest);
    i++;
  }

  return result;
}

function parseScalar(value: string): string | number | boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null" || value === "~") return "";
  const num = Number(value);
  if (!Number.isNaN(num) && value !== "") return num;
  // 따옴표 제거
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}
