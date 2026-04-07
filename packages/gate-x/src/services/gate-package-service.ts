import type { GateType, GateStatus } from "../schemas/gate-package.schema.js";

export interface GatePackageItem { type: string; id: string; title: string; content?: string; }
export interface GatePackage { id: string; orgId: string; bizItemId: string; gateType: GateType; items: GatePackageItem[]; status: GateStatus; downloadUrl: string | null; createdBy: string; createdAt: string; }
export interface CreateGatePackageInput { bizItemId: string; orgId: string; gateType: GateType; createdBy: string; }

export class GatePackageService {
  constructor(private db: D1Database) {}

  async create(input: CreateGatePackageInput): Promise<GatePackage> {
    const items = await this.collectArtifacts(input.bizItemId, input.orgId);
    const types = items.map((i) => i.type);
    const missing: string[] = [];
    if (!types.includes("bmc")) missing.push("BMC");
    if (!types.includes("prd")) missing.push("PRD");
    if (missing.length > 0) throw new MissingArtifactsError(missing);

    const id = crypto.randomUUID();
    await this.db.prepare(`INSERT INTO gate_packages (id, org_id, biz_item_id, gate_type, items, created_by) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(id, input.orgId, input.bizItemId, input.gateType, JSON.stringify(items), input.createdBy)
      .run();

    return { id, orgId: input.orgId, bizItemId: input.bizItemId, gateType: input.gateType, items, status: "draft", downloadUrl: null, createdBy: input.createdBy, createdAt: new Date().toISOString() };
  }

  async get(bizItemId: string, orgId: string): Promise<GatePackage | null> {
    const row = await this.db.prepare(`SELECT id, org_id, biz_item_id, gate_type, items, status, download_url, created_by, created_at FROM gate_packages WHERE biz_item_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 1`).bind(bizItemId, orgId).first<Record<string, unknown>>();
    return row ? this.mapRow(row) : null;
  }

  async getDownload(bizItemId: string, orgId: string): Promise<{ filename: string; items: GatePackageItem[] } | null> {
    const pkg = await this.get(bizItemId, orgId);
    if (!pkg) return null;
    return { filename: `gate-${pkg.gateType}-${bizItemId}.zip`, items: pkg.items };
  }

  async updateStatus(bizItemId: string, orgId: string, status: GateStatus): Promise<GatePackage | null> {
    const pkg = await this.get(bizItemId, orgId);
    if (!pkg) return null;
    await this.db.prepare(`UPDATE gate_packages SET status = ? WHERE id = ?`).bind(status, pkg.id).run();
    return { ...pkg, status };
  }

  private async collectArtifacts(bizItemId: string, orgId: string): Promise<GatePackageItem[]> {
    const items: GatePackageItem[] = [];
    const bmc = await this.db.prepare(`SELECT id, title FROM bmc_canvases WHERE biz_item_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 1`).bind(bizItemId, orgId).first<Record<string, unknown>>();
    if (bmc) items.push({ type: "bmc", id: bmc["id"] as string, title: (bmc["title"] as string) || "BMC" });
    const prd = await this.db.prepare(`SELECT id, title FROM prd_documents WHERE biz_item_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 1`).bind(bizItemId, orgId).first<Record<string, unknown>>();
    if (prd) items.push({ type: "prd", id: prd["id"] as string, title: (prd["title"] as string) || "PRD" });
    const bdp = await this.db.prepare(`SELECT id, version_num FROM bdp_versions WHERE biz_item_id = ? AND org_id = ? ORDER BY version_num DESC LIMIT 1`).bind(bizItemId, orgId).first<Record<string, unknown>>();
    if (bdp) items.push({ type: "bdp", id: bdp["id"] as string, title: `BDP v${String(bdp["version_num"])}` });
    return items;
  }

  private mapRow(r: Record<string, unknown>): GatePackage {
    let items: GatePackageItem[];
    try { items = JSON.parse(r["items"] as string) as GatePackageItem[]; } catch { items = []; }
    return { id: r["id"] as string, orgId: r["org_id"] as string, bizItemId: r["biz_item_id"] as string, gateType: r["gate_type"] as GateType, items, status: r["status"] as GateStatus, downloadUrl: (r["download_url"] as string) || null, createdBy: r["created_by"] as string, createdAt: r["created_at"] as string };
  }
}

export class MissingArtifactsError extends Error {
  public missing: string[];
  constructor(missing: string[]) {
    super(`Missing required artifacts: ${missing.join(", ")}`);
    this.name = "MissingArtifactsError";
    this.missing = missing;
  }
}
