// ─── F336: AgentAdapterRegistry — 이름/역할별 어댑터 중앙 레지스트리 (Sprint 151) ───

import type { AgentAdapter, AgentRole } from "@foundry-x/shared";

export class AgentAdapterRegistry {
  private adapters: Map<string, AgentAdapter> = new Map();

  /** 어댑터 등록 */
  register(adapter: AgentAdapter): void {
    this.adapters.set(adapter.name, adapter);
  }

  /** 이름으로 조회 */
  get(name: string): AgentAdapter | undefined {
    return this.adapters.get(name);
  }

  /** 역할별 필터 */
  getByRole(role: AgentRole): AgentAdapter[] {
    return [...this.adapters.values()].filter((a) => a.role === role);
  }

  /** 전체 목록 */
  list(): AgentAdapter[] {
    return [...this.adapters.values()];
  }

  /** adversarial 모드용 — generator+discriminator 쌍 조회 */
  getAdversarialPair(
    generatorName?: string,
    discriminatorName?: string,
  ): {
    generator: AgentAdapter | undefined;
    discriminator: AgentAdapter | undefined;
  } {
    const generators = this.getByRole("generator");
    const discriminators = this.getByRole("discriminator");
    return {
      generator: generatorName
        ? this.get(generatorName)
        : generators[0],
      discriminator: discriminatorName
        ? this.get(discriminatorName)
        : discriminators[0],
    };
  }

  /** 등록된 어댑터 수 */
  get size(): number {
    return this.adapters.size;
  }

  /** 전체 해제 (테스트/cleanup용) */
  clear(): void {
    this.adapters.clear();
  }
}
