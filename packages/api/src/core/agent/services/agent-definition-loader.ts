// @ts-nocheck — 간이 YAML 파서: regex match groups + array indexing에 대한 strict null 검사 면제
/**
 * F221: Agent-as-Code — YAML/JSON 에이전트 정의 파서 + 검증
 * BMAD .agent.yaml 패턴을 Foundry-X에 적용
 */

import { AgentDefinitionSchema } from "../schemas/agent-definition.js";
import type { z } from "@hono/zod-openapi";

export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;

export interface MenuItem {
  action: string;
  label: string;
  description?: string;
}

export interface CustomizationField {
  type: "string" | "number" | "boolean" | "array";
  default: unknown;
  enum?: string[];
  min?: number;
  max?: number;
  items?: { type: string };
}

/**
 * 간이 YAML 파서 — Workers 환경에서 외부 의존성 없이 YAML 에이전트 정의를 파싱한다.
 * 완전한 YAML spec이 아닌, 에이전트 정의에 필요한 subset만 지원:
 * - key: value (스칼라)
 * - key: | (멀티라인 문자열)
 * - key: (배열/오브젝트 — YAML indent 기반)
 */
export function parseSimpleYaml(input: string): Record<string, unknown> {
  const lines = input.split("\n");
  const result: Record<string, unknown> = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!!;

    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith("#")) {
      i++;
      continue;
    }

    // Top-level key
    const keyMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)/);
    if (!keyMatch) {
      i++;
      continue;
    }

    const key = keyMatch[1]!;
    const inlineValue = keyMatch[2]!.trim();

    if (inlineValue === "|") {
      // Multi-line string
      i++;
      const blockLines: string[] = [];
      while (i < lines.length) {
        const bline = lines[i]!;
        if (bline.length === 0) {
          blockLines.push("");
          i++;
          continue;
        }
        if (bline.match(/^\S/)) break; // new top-level key
        blockLines.push(bline.replace(/^ {2}/, ""));
        i++;
      }
      // Trim trailing empty lines
      while (blockLines.length > 0 && blockLines[blockLines.length - 1] === "") {
        blockLines.pop();
      }
      result[key!] = blockLines.join("\n");
    } else if (inlineValue === "" || inlineValue === undefined) {
      // Block sequence or mapping
      i++;
      const items: unknown[] = [];
      const map: Record<string, unknown> = {};
      let isArray = false;
      let isMap = false;

      while (i < lines.length) {
        const bline = lines[i]!;
        if (bline.length === 0) {
          i++;
          continue;
        }
        if (bline.match(/^\S/)) break; // new top-level key

        const trimmed = bline.trim();

        // Array item: "  - value" or "  - key: value"
        const arrMatch = trimmed.match(/^-\s+(.*)/);
        if (arrMatch) {
          isArray = true;
          const arrVal = arrMatch[1].trim();

          // Check if this is an object item (has colon)
          const objKeyMatch = arrVal.match(/^(\w[\w-]*)\s*:\s*(.*)/);
          if (objKeyMatch) {
            // Object item in array
            const obj: Record<string, unknown> = {};
            obj[objKeyMatch[1]] = parseScalar(objKeyMatch[2].trim());
            i++;
            // Continue reading indented keys for this object
            while (i < lines.length) {
              const oLine = lines[i]!;
              if (!oLine.trim() || oLine.match(/^\S/) || oLine.trim().startsWith("-")) break;
              const oMatch = oLine.trim().match(/^(\w[\w-]*)\s*:\s*(.*)/);
              if (oMatch) {
                obj[oMatch[1]] = parseScalar(oMatch[2].trim());
                i++;
              } else {
                break;
              }
            }
            items.push(obj);
          } else {
            items.push(parseScalar(arrVal));
            i++;
          }
        } else {
          // Map entry: "  key: value"
          const mapMatch = trimmed.match(/^(\w[\w-]*)\s*:\s*(.*)/);
          if (mapMatch) {
            isMap = true;
            const subKey = mapMatch[1];
            const subVal = mapMatch[2].trim();

            if (subVal === "" || subVal === undefined) {
              // Nested object
              i++;
              const nested: Record<string, unknown> = {};
              while (i < lines.length) {
                const nLine = lines[i]!;
                if (!nLine.trim() || nLine.match(/^\S/)) break;
                // Need deeper indent
                const nMatch = nLine.trim().match(/^(\w[\w-]*)\s*:\s*(.*)/);
                if (nMatch) {
                  const nVal = nMatch[2].trim();
                  if (nVal.startsWith("[") && nVal.endsWith("]")) {
                    // Inline array
                    nested[nMatch[1]] = nVal
                      .slice(1, -1)
                      .split(",")
                      .map((s) => parseScalar(s.trim()));
                  } else {
                    nested[nMatch[1]] = parseScalar(nVal);
                  }
                  i++;
                } else {
                  break;
                }
              }
              map[subKey] = nested;
            } else {
              map[subKey] = parseScalar(subVal);
              i++;
            }
          } else {
            i++;
          }
        }
      }

      result[key] = isArray ? items : isMap ? map : items;
    } else {
      // Inline value
      if (inlineValue.startsWith("[") && inlineValue.endsWith("]")) {
        result[key] = inlineValue
          .slice(1, -1)
          .split(",")
          .map((s) => parseScalar(s.trim()));
      } else {
        result[key] = parseScalar(inlineValue);
      }
      i++;
    }
  }

  return result;
}

function parseScalar(value: string): unknown {
  if (value === "null" || value === "~") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  // Strip quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

/** YAML/JSON → AgentDefinition 변환 + Zod 검증 */
export function parseAgentDefinition(content: string, format: "yaml" | "json"): AgentDefinition {
  const raw = format === "json" ? JSON.parse(content) : parseSimpleYaml(content);

  // Normalize field names (YAML uses snake_case aliases)
  const normalized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const camelKey = k === "system_prompt" ? "systemPrompt"
      : k === "allowed_tools" ? "allowedTools"
      : k === "preferred_model" ? "preferredModel"
      : k === "preferred_runner_type" ? "preferredRunnerType"
      : k === "task_type" ? "taskType"
      : k;
    normalized[camelKey] = v;
  }

  return AgentDefinitionSchema.parse(normalized);
}

/** AgentDefinition → YAML 문자열 export */
export function exportToYaml(def: AgentDefinition): string {
  const lines: string[] = [];

  lines.push(`name: ${def.name}`);
  if (def.description) lines.push(`description: "${def.description}"`);
  if (def.persona) {
    lines.push("persona: |");
    for (const pLine of def.persona.split("\n")) {
      lines.push(`  ${pLine}`);
    }
  }
  lines.push(`system_prompt: "${def.systemPrompt.replace(/"/g, '\\"')}"`);

  if (def.allowedTools?.length) {
    lines.push("allowed_tools:");
    for (const tool of def.allowedTools) {
      lines.push(`  - ${tool}`);
    }
  }

  if (def.preferredModel !== undefined) {
    lines.push(`preferred_model: ${def.preferredModel ?? "null"}`);
  }
  if (def.preferredRunnerType) {
    lines.push(`preferred_runner_type: ${def.preferredRunnerType}`);
  }
  if (def.taskType) {
    lines.push(`task_type: ${def.taskType}`);
  }

  if (def.dependencies?.length) {
    lines.push("dependencies:");
    for (const dep of def.dependencies) {
      lines.push(`  - ${dep}`);
    }
  }

  if (def.customization && Object.keys(def.customization).length > 0) {
    lines.push("customization:");
    for (const [fieldName, field] of Object.entries(def.customization)) {
      lines.push(`  ${fieldName}:`);
      lines.push(`    type: ${field.type}`);
      if (field.default !== undefined) {
        if (Array.isArray(field.default)) {
          lines.push(`    default: [${(field.default as string[]).join(", ")}]`);
        } else {
          lines.push(`    default: ${field.default}`);
        }
      }
      if (field.enum) {
        lines.push(`    enum: [${field.enum.join(", ")}]`);
      }
      if (field.min !== undefined) lines.push(`    min: ${field.min}`);
      if (field.max !== undefined) lines.push(`    max: ${field.max}`);
      if (field.items) lines.push(`    items: { type: ${field.items.type} }`);
    }
  }

  if (def.menu?.length) {
    lines.push("menu:");
    for (const item of def.menu) {
      lines.push(`  - action: ${item.action}`);
      lines.push(`    label: "${item.label}"`);
      if (item.description) {
        lines.push(`    description: "${item.description}"`);
      }
    }
  }

  return lines.join("\n") + "\n";
}
