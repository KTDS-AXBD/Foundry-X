/**
 * Sprint 59 F191: MethodologyRegistry — 싱글톤 방법론 모듈 레지스트리
 * 등록된 MethodologyModule 인스턴스를 관리하고, 사업 아이템에 대한 추천/매칭을 수행.
 */
import type {
  MethodologyModule,
  MethodologyModuleMeta,
  MethodologyRecommendation,
  BizItemContext,
} from "./methodology-module.js";

export class MethodologyRegistry {
  private static instance: MethodologyRegistry | null = null;
  private modules = new Map<string, MethodologyModule>();

  private constructor() {}

  static getInstance(): MethodologyRegistry {
    if (!MethodologyRegistry.instance) {
      MethodologyRegistry.instance = new MethodologyRegistry();
    }
    return MethodologyRegistry.instance;
  }

  static resetForTest(): void {
    MethodologyRegistry.instance = null;
  }

  register(module: MethodologyModule): void {
    if (this.modules.has(module.id)) {
      throw new Error(`Methodology module '${module.id}' is already registered`);
    }
    this.modules.set(module.id, module);
  }

  unregister(id: string): boolean {
    return this.modules.delete(id);
  }

  get(id: string): MethodologyModule | undefined {
    return this.modules.get(id);
  }

  getAll(): MethodologyModule[] {
    return Array.from(this.modules.values());
  }

  getAllMeta(): MethodologyModuleMeta[] {
    return this.getAll().map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description,
      version: m.version,
      isActive: true,
      configJson: null,
      criteriaCount: m.getCriteria().length,
      reviewMethodCount: m.getReviewMethods().length,
    }));
  }

  async recommend(item: BizItemContext): Promise<MethodologyRecommendation[]> {
    const results: MethodologyRecommendation[] = [];
    for (const m of this.modules.values()) {
      const score = await m.matchScore(item);
      results.push({
        methodologyId: m.id,
        name: m.name,
        matchScore: score,
        description: m.description,
      });
    }
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  async findBest(item: BizItemContext): Promise<MethodologyRecommendation | null> {
    const recs = await this.recommend(item);
    return recs[0] ?? null;
  }

  get size(): number {
    return this.modules.size;
  }
}
