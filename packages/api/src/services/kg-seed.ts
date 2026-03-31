/**
 * F255: KG sample data seeder — petrochemical + semiconductor supply chains
 */

import { KgNodeService } from "./kg-node.js";
import { KgEdgeService } from "./kg-edge.js";

function uid(): string {
  return crypto.randomUUID();
}

interface SeedNode {
  id: string;
  type: string;
  name: string;
  nameEn?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface SeedEdge {
  sourceId: string;
  targetId: string;
  relationType: string;
  weight: number;
  label?: string;
}

export class KgSeedService {
  private nodeService: KgNodeService;
  private edgeService: KgEdgeService;

  constructor(private db: D1Database) {
    this.nodeService = new KgNodeService(db);
    this.edgeService = new KgEdgeService(db);
  }

  async seedAll(orgId: string): Promise<{ nodes: number; edges: number }> {
    const r1 = await this.seedPetrochemicalChain(orgId);
    const r2 = await this.seedSemiconductorChain(orgId);
    const r3 = await this.seedEvents(orgId);
    return {
      nodes: r1.nodes + r2.nodes + r3.nodes,
      edges: r1.edges + r2.edges + r3.edges,
    };
  }

  async seedPetrochemicalChain(orgId: string): Promise<{ nodes: number; edges: number }> {
    // Products
    const nodes: SeedNode[] = [
      { id: "p-crude-oil", type: "PRODUCT", name: "원유", nameEn: "Crude Oil", metadata: { hsCode: "2709" } },
      { id: "p-naphtha", type: "PRODUCT", name: "나프타", nameEn: "Naphtha", metadata: { hsCode: "2710" } },
      { id: "p-ethylene", type: "PRODUCT", name: "에틸렌", nameEn: "Ethylene", metadata: { givcCode: "GVC20101" } },
      { id: "p-propylene", type: "PRODUCT", name: "프로필렌", nameEn: "Propylene" },
      { id: "p-benzene", type: "PRODUCT", name: "벤젠", nameEn: "Benzene" },
      { id: "p-butadiene", type: "PRODUCT", name: "부타디엔", nameEn: "Butadiene" },
      { id: "p-pe", type: "PRODUCT", name: "폴리에틸렌(PE)", nameEn: "Polyethylene" },
      { id: "p-pp", type: "PRODUCT", name: "폴리프로필렌(PP)", nameEn: "Polypropylene" },
      { id: "p-ps", type: "PRODUCT", name: "폴리스티렌(PS)", nameEn: "Polystyrene" },
      { id: "p-sbr", type: "PRODUCT", name: "합성고무(SBR)", nameEn: "SBR Rubber" },
      { id: "p-abs", type: "PRODUCT", name: "ABS수지", nameEn: "ABS Resin" },
      { id: "p-pet", type: "PRODUCT", name: "PET수지", nameEn: "PET Resin" },
      { id: "p-nylon", type: "PRODUCT", name: "합성섬유(나일론)", nameEn: "Nylon" },
      { id: "p-car-interior", type: "PRODUCT", name: "자동차내장재", nameEn: "Automotive Interior" },
      { id: "p-tire", type: "PRODUCT", name: "타이어", nameEn: "Tire" },
      { id: "p-medical-parts", type: "PRODUCT", name: "의료기기부품", nameEn: "Medical Device Parts" },
      { id: "p-packaging", type: "PRODUCT", name: "포장필름", nameEn: "Packaging Film" },
      { id: "p-construction", type: "PRODUCT", name: "건축자재", nameEn: "Construction Material" },
    ];

    // Industries
    nodes.push(
      { id: "i-petrochem", type: "INDUSTRY", name: "석유화학", nameEn: "Petrochemical" },
      { id: "i-auto", type: "INDUSTRY", name: "자동차", nameEn: "Automotive" },
      { id: "i-medical", type: "INDUSTRY", name: "의료기기", nameEn: "Medical Device" },
      { id: "i-construction", type: "INDUSTRY", name: "건설", nameEn: "Construction" },
    );

    // Countries
    nodes.push(
      { id: "c-kr", type: "COUNTRY", name: "한국", nameEn: "South Korea", metadata: { iso: "KR" } },
      { id: "c-sa", type: "COUNTRY", name: "사우디아라비아", nameEn: "Saudi Arabia", metadata: { iso: "SA" } },
      { id: "c-us", type: "COUNTRY", name: "미국", nameEn: "United States", metadata: { iso: "US" } },
      { id: "c-cn", type: "COUNTRY", name: "중국", nameEn: "China", metadata: { iso: "CN" } },
    );

    // Companies
    nodes.push(
      { id: "co-lgchem", type: "COMPANY", name: "LG화학", nameEn: "LG Chem" },
      { id: "co-lotte", type: "COMPANY", name: "롯데케미칼", nameEn: "Lotte Chemical" },
    );

    // Edges — supply chain
    const edges: SeedEdge[] = [
      // Crude oil → Naphtha
      { sourceId: "p-crude-oil", targetId: "p-naphtha", relationType: "SUPPLIES", weight: 0.9, label: "정유" },
      // Naphtha → intermediates
      { sourceId: "p-naphtha", targetId: "p-ethylene", relationType: "SUPPLIES", weight: 0.85, label: "NCC 공정" },
      { sourceId: "p-naphtha", targetId: "p-propylene", relationType: "SUPPLIES", weight: 0.8, label: "NCC 공정" },
      { sourceId: "p-naphtha", targetId: "p-benzene", relationType: "SUPPLIES", weight: 0.75, label: "BTX 추출" },
      { sourceId: "p-naphtha", targetId: "p-butadiene", relationType: "SUPPLIES", weight: 0.7, label: "NCC 부산물" },
      // Intermediates → polymers
      { sourceId: "p-ethylene", targetId: "p-pe", relationType: "SUPPLIES", weight: 0.9, label: "중합" },
      { sourceId: "p-ethylene", targetId: "p-pet", relationType: "SUPPLIES", weight: 0.7 },
      { sourceId: "p-propylene", targetId: "p-pp", relationType: "SUPPLIES", weight: 0.9, label: "중합" },
      { sourceId: "p-benzene", targetId: "p-ps", relationType: "SUPPLIES", weight: 0.8 },
      { sourceId: "p-benzene", targetId: "p-abs", relationType: "SUPPLIES", weight: 0.75 },
      { sourceId: "p-butadiene", targetId: "p-sbr", relationType: "SUPPLIES", weight: 0.85 },
      { sourceId: "p-butadiene", targetId: "p-abs", relationType: "SUPPLIES", weight: 0.7 },
      { sourceId: "p-propylene", targetId: "p-nylon", relationType: "SUPPLIES", weight: 0.6 },
      // Polymers → end products
      { sourceId: "p-pe", targetId: "p-packaging", relationType: "SUPPLIES", weight: 0.8 },
      { sourceId: "p-pp", targetId: "p-car-interior", relationType: "SUPPLIES", weight: 0.85 },
      { sourceId: "p-pp", targetId: "p-medical-parts", relationType: "SUPPLIES", weight: 0.7 },
      { sourceId: "p-abs", targetId: "p-car-interior", relationType: "SUPPLIES", weight: 0.75 },
      { sourceId: "p-sbr", targetId: "p-tire", relationType: "SUPPLIES", weight: 0.9 },
      { sourceId: "p-ps", targetId: "p-construction", relationType: "SUPPLIES", weight: 0.65 },
      { sourceId: "p-pet", targetId: "p-packaging", relationType: "SUPPLIES", weight: 0.75 },
      // Industry membership
      { sourceId: "p-ethylene", targetId: "i-petrochem", relationType: "BELONGS_TO", weight: 1.0 },
      { sourceId: "p-pe", targetId: "i-petrochem", relationType: "BELONGS_TO", weight: 1.0 },
      { sourceId: "p-car-interior", targetId: "i-auto", relationType: "BELONGS_TO", weight: 1.0 },
      { sourceId: "p-tire", targetId: "i-auto", relationType: "BELONGS_TO", weight: 1.0 },
      { sourceId: "p-medical-parts", targetId: "i-medical", relationType: "BELONGS_TO", weight: 1.0 },
      { sourceId: "p-construction", targetId: "i-construction", relationType: "BELONGS_TO", weight: 1.0 },
      // Country production
      { sourceId: "p-crude-oil", targetId: "c-sa", relationType: "PRODUCED_IN", weight: 1.0 },
      { sourceId: "p-naphtha", targetId: "c-kr", relationType: "PRODUCED_IN", weight: 1.0 },
      { sourceId: "p-pe", targetId: "c-kr", relationType: "PRODUCED_IN", weight: 1.0 },
      // Company production
      { sourceId: "p-pe", targetId: "co-lgchem", relationType: "PRODUCED_BY", weight: 1.0 },
      { sourceId: "p-pp", targetId: "co-lotte", relationType: "PRODUCED_BY", weight: 1.0 },
      // Substitutes
      { sourceId: "p-pe", targetId: "p-pp", relationType: "SUBSTITUTES", weight: 0.5, label: "일부 용도 대체 가능" },
      // Competes
      { sourceId: "co-lgchem", targetId: "co-lotte", relationType: "COMPETES_WITH", weight: 0.6 },
    ];

    return this.insertData(orgId, nodes, edges);
  }

  async seedSemiconductorChain(orgId: string): Promise<{ nodes: number; edges: number }> {
    const nodes: SeedNode[] = [
      { id: "p-wafer", type: "PRODUCT", name: "실리콘웨이퍼", nameEn: "Silicon Wafer" },
      { id: "p-photomask", type: "PRODUCT", name: "포토마스크", nameEn: "Photomask" },
      { id: "p-photoresist", type: "PRODUCT", name: "포토레지스트", nameEn: "Photoresist" },
      { id: "p-neon", type: "PRODUCT", name: "네온가스", nameEn: "Neon Gas" },
      { id: "p-hf", type: "PRODUCT", name: "불화수소", nameEn: "Hydrogen Fluoride" },
      { id: "p-etch-gas", type: "PRODUCT", name: "에칭가스", nameEn: "Etching Gas" },
      { id: "p-die", type: "PRODUCT", name: "다이", nameEn: "Die" },
      { id: "p-leadframe", type: "PRODUCT", name: "리드프레임", nameEn: "Lead Frame" },
      { id: "p-substrate", type: "PRODUCT", name: "패키징기판", nameEn: "Packaging Substrate" },
      { id: "p-dram", type: "PRODUCT", name: "메모리칩(DRAM)", nameEn: "DRAM" },
      { id: "p-nand", type: "PRODUCT", name: "메모리칩(NAND)", nameEn: "NAND Flash" },
      { id: "p-ap", type: "PRODUCT", name: "AP칩", nameEn: "Application Processor" },
    ];

    nodes.push(
      { id: "i-semi", type: "INDUSTRY", name: "반도체", nameEn: "Semiconductor" },
      { id: "i-electronics", type: "INDUSTRY", name: "전자부품", nameEn: "Electronics" },
      { id: "c-jp", type: "COUNTRY", name: "일본", nameEn: "Japan", metadata: { iso: "JP" } },
      { id: "c-tw", type: "COUNTRY", name: "대만", nameEn: "Taiwan", metadata: { iso: "TW" } },
      { id: "t-litho", type: "TECHNOLOGY", name: "노광공정", nameEn: "Lithography" },
      { id: "t-etch", type: "TECHNOLOGY", name: "에칭공정", nameEn: "Etching" },
    );

    const edges: SeedEdge[] = [
      // Wafer → Die (full process chain)
      { sourceId: "p-wafer", targetId: "p-die", relationType: "SUPPLIES", weight: 0.9, label: "웨이퍼 가공" },
      { sourceId: "p-photomask", targetId: "p-die", relationType: "SUPPLIES", weight: 0.85, label: "패터닝" },
      { sourceId: "p-photoresist", targetId: "p-die", relationType: "SUPPLIES", weight: 0.8 },
      { sourceId: "p-neon", targetId: "p-die", relationType: "SUPPLIES", weight: 0.75, label: "노광 소재" },
      { sourceId: "p-hf", targetId: "p-die", relationType: "SUPPLIES", weight: 0.8, label: "세정" },
      { sourceId: "p-etch-gas", targetId: "p-die", relationType: "SUPPLIES", weight: 0.8, label: "에칭" },
      // Die → chips
      { sourceId: "p-die", targetId: "p-dram", relationType: "SUPPLIES", weight: 0.9, label: "패키징" },
      { sourceId: "p-die", targetId: "p-nand", relationType: "SUPPLIES", weight: 0.9, label: "패키징" },
      { sourceId: "p-die", targetId: "p-ap", relationType: "SUPPLIES", weight: 0.85 },
      { sourceId: "p-leadframe", targetId: "p-dram", relationType: "SUPPLIES", weight: 0.7 },
      { sourceId: "p-substrate", targetId: "p-dram", relationType: "SUPPLIES", weight: 0.75 },
      { sourceId: "p-leadframe", targetId: "p-nand", relationType: "SUPPLIES", weight: 0.7 },
      { sourceId: "p-substrate", targetId: "p-ap", relationType: "SUPPLIES", weight: 0.8 },
      // Industry membership
      { sourceId: "p-wafer", targetId: "i-semi", relationType: "BELONGS_TO", weight: 1.0 },
      { sourceId: "p-dram", targetId: "i-semi", relationType: "BELONGS_TO", weight: 1.0 },
      { sourceId: "p-nand", targetId: "i-semi", relationType: "BELONGS_TO", weight: 1.0 },
      { sourceId: "p-ap", targetId: "i-electronics", relationType: "BELONGS_TO", weight: 1.0 },
      // Countries
      { sourceId: "p-hf", targetId: "c-jp", relationType: "PRODUCED_IN", weight: 1.0 },
      { sourceId: "p-photoresist", targetId: "c-jp", relationType: "PRODUCED_IN", weight: 1.0 },
      { sourceId: "p-wafer", targetId: "c-kr", relationType: "PRODUCED_IN", weight: 1.0 },
      { sourceId: "p-die", targetId: "c-tw", relationType: "PRODUCED_IN", weight: 0.8 },
      // Technology usage
      { sourceId: "p-photomask", targetId: "t-litho", relationType: "USES_TECH", weight: 0.9 },
      { sourceId: "p-neon", targetId: "t-litho", relationType: "USES_TECH", weight: 0.8 },
      { sourceId: "p-etch-gas", targetId: "t-etch", relationType: "USES_TECH", weight: 0.9 },
      { sourceId: "p-hf", targetId: "t-etch", relationType: "USES_TECH", weight: 0.85 },
      // Substitutes
      { sourceId: "p-dram", targetId: "p-nand", relationType: "SUBSTITUTES", weight: 0.3, label: "일부 용도" },
    ];

    return this.insertData(orgId, nodes, edges);
  }

  async seedEvents(orgId: string): Promise<{ nodes: number; edges: number }> {
    const nodes: SeedNode[] = [
      { id: "e-mideast", type: "EVENT", name: "중동 분쟁", nameEn: "Middle East Conflict", metadata: { eventType: "conflict", severity: "high", date: "2026-01" } },
      { id: "e-japan-export", type: "EVENT", name: "일본 수출 규제", nameEn: "Japan Export Controls", metadata: { eventType: "regulation", severity: "high", date: "2025-07" } },
      { id: "e-taiwan-eq", type: "EVENT", name: "대만 지진", nameEn: "Taiwan Earthquake", metadata: { eventType: "natural_disaster", severity: "medium", date: "2026-02" } },
      { id: "e-eu-cbam", type: "EVENT", name: "EU 탄소국경조정", nameEn: "EU CBAM", metadata: { eventType: "regulation", severity: "medium", date: "2026-01" } },
      { id: "e-us-china-semi", type: "EVENT", name: "미중 반도체 규제", nameEn: "US-China Semiconductor Restrictions", metadata: { eventType: "regulation", severity: "high", date: "2025-10" } },
    ];

    const edges: SeedEdge[] = [
      { sourceId: "e-mideast", targetId: "p-crude-oil", relationType: "AFFECTED_BY", weight: 0.95, label: "공급 차질" },
      { sourceId: "e-japan-export", targetId: "p-hf", relationType: "AFFECTED_BY", weight: 0.9, label: "수출 규제" },
      { sourceId: "e-japan-export", targetId: "p-photoresist", relationType: "AFFECTED_BY", weight: 0.85, label: "수출 규제" },
      { sourceId: "e-taiwan-eq", targetId: "p-die", relationType: "AFFECTED_BY", weight: 0.8, label: "생산 중단" },
      { sourceId: "e-taiwan-eq", targetId: "p-wafer", relationType: "AFFECTED_BY", weight: 0.6, label: "부분 영향" },
      { sourceId: "e-eu-cbam", targetId: "p-pe", relationType: "AFFECTED_BY", weight: 0.5, label: "탄소 비용 증가" },
      { sourceId: "e-eu-cbam", targetId: "p-construction", relationType: "AFFECTED_BY", weight: 0.4, label: "간접 비용 영향" },
      { sourceId: "e-us-china-semi", targetId: "p-dram", relationType: "AFFECTED_BY", weight: 0.7, label: "수출 제한" },
      { sourceId: "e-us-china-semi", targetId: "p-ap", relationType: "AFFECTED_BY", weight: 0.8, label: "설계 제한" },
    ];

    return this.insertData(orgId, nodes, edges);
  }

  async clearAll(orgId: string): Promise<void> {
    await this.db.prepare("DELETE FROM kg_properties WHERE entity_id IN (SELECT id FROM kg_nodes WHERE org_id = ?) OR entity_id IN (SELECT id FROM kg_edges WHERE org_id = ?)").bind(orgId, orgId).run();
    await this.db.prepare("DELETE FROM kg_edges WHERE org_id = ?").bind(orgId).run();
    await this.db.prepare("DELETE FROM kg_nodes WHERE org_id = ?").bind(orgId).run();
  }

  private async insertData(
    orgId: string,
    nodes: SeedNode[],
    edges: SeedEdge[]
  ): Promise<{ nodes: number; edges: number }> {
    let nodeCount = 0;
    for (const n of nodes) {
      // Skip if already exists
      const existing = await this.db.prepare("SELECT id FROM kg_nodes WHERE id = ? AND org_id = ?").bind(n.id, orgId).first();
      if (existing) continue;

      await this.nodeService.create({
        id: n.id,
        orgId,
        type: n.type as any,
        name: n.name,
        nameEn: n.nameEn,
        description: n.description,
        metadata: n.metadata,
      });
      nodeCount++;
    }

    let edgeCount = 0;
    for (const e of edges) {
      await this.edgeService.create({
        id: uid(),
        orgId,
        sourceNodeId: e.sourceId,
        targetNodeId: e.targetId,
        relationType: e.relationType as any,
        weight: e.weight,
        label: e.label,
      });
      edgeCount++;
    }

    return { nodes: nodeCount, edges: edgeCount };
  }
}
