// ─── F527: F-L2-6 ToolRegistry (Sprint 280) ───

import type { ToolCategory, AnthropicToolDef } from "@foundry-x/shared";
import type { ToolDefinition } from "./define-tool.js";
import { toJsonSchema } from "./define-tool.js";

/**
 * 도구 등록/검색/카테고리화.
 * Strands SDK의 ToolRegistry 패턴을 Foundry-X에 맞게 구현.
 */
export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  /** 도구를 레지스트리에 등록한다. 체이닝 지원. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register(tool: ToolDefinition<any, any>): this {
    this.tools.set(tool.name, tool);
    return this;
  }

  /** 이름으로 도구를 조회한다. 없으면 undefined. */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /** 이름으로 존재 여부 확인 */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 등록된 도구 목록 반환.
   * @param filter.category — 카테고리 필터 (없으면 전체)
   */
  list(filter?: { category?: ToolCategory }): ToolDefinition[] {
    const all = Array.from(this.tools.values());
    if (filter?.category) {
      return all.filter((t) => t.category === filter.category);
    }
    return all;
  }

  /** Claude API 포맷(AnthropicToolDef[])으로 변환 */
  toAnthropicTools(names?: string[]): AnthropicToolDef[] {
    const tools = names
      ? names.map((n) => this.tools.get(n)).filter((t): t is ToolDefinition => !!t)
      : Array.from(this.tools.values());

    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: toJsonSchema(t.inputSchema),
    }));
  }

  /** 레지스트리 초기화 */
  clear(): void {
    this.tools.clear();
  }

  get size(): number {
    return this.tools.size;
  }
}
