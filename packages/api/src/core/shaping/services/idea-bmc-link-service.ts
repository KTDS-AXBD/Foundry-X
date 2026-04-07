import { IdeaService, type Idea } from "../../discovery/services/idea-service.js";
import { BmcService, type Bmc } from "./bmc-service.js";

// ─── Summary 타입 ───
export interface BmcSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface IdeaSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export class IdeaBmcLinkService {
  private ideaService: IdeaService;
  private bmcService: BmcService;

  constructor(private db: D1Database) {
    this.ideaService = new IdeaService(db);
    this.bmcService = new BmcService(db);
  }

  async createBmcFromIdea(
    ideaId: string,
    tenantId: string,
    userId: string,
    title?: string
  ): Promise<{ bmc: Bmc; linkId: string }> {
    const idea = await this.ideaService.getById(tenantId, ideaId);
    if (!idea) throw new NotFoundError("Idea not found");

    const bmcTitle = title ?? `BMC: ${idea.title}`;
    const bmc = await this.bmcService.create(tenantId, userId, {
      title: bmcTitle,
      ideaId,
    });

    const linkId = crypto.randomUUID();
    const now = Date.now();

    await this.db
      .prepare(
        `INSERT INTO ax_idea_bmc_links (id, idea_id, bmc_id, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .bind(linkId, ideaId, bmc.id, now)
      .run();

    return { bmc, linkId };
  }

  async linkBmc(
    ideaId: string,
    bmcId: string,
    tenantId: string
  ): Promise<{ linkId: string }> {
    const idea = await this.ideaService.getById(tenantId, ideaId);
    if (!idea) throw new NotFoundError("Idea not found");

    const bmc = await this.bmcService.getById(tenantId, bmcId);
    if (!bmc) throw new NotFoundError("BMC not found");

    // UNIQUE 제약으로 중복 검사
    const existing = await this.db
      .prepare(
        "SELECT id FROM ax_idea_bmc_links WHERE idea_id = ? AND bmc_id = ?"
      )
      .bind(ideaId, bmcId)
      .first<{ id: string }>();

    if (existing) throw new ConflictError("Already linked");

    const linkId = crypto.randomUUID();
    const now = Date.now();

    await this.db
      .prepare(
        `INSERT INTO ax_idea_bmc_links (id, idea_id, bmc_id, created_at)
         VALUES (?, ?, ?, ?)`
      )
      .bind(linkId, ideaId, bmcId, now)
      .run();

    return { linkId };
  }

  async unlinkBmc(
    ideaId: string,
    bmcId: string,
    tenantId: string
  ): Promise<void> {
    // 존재 확인 (tenantId 격리)
    const idea = await this.ideaService.getById(tenantId, ideaId);
    if (!idea) throw new NotFoundError("Idea not found");

    const result = await this.db
      .prepare(
        "DELETE FROM ax_idea_bmc_links WHERE idea_id = ? AND bmc_id = ?"
      )
      .bind(ideaId, bmcId)
      .run();

    if ((result.meta?.changes ?? 0) === 0) {
      throw new NotFoundError("Link not found");
    }
  }

  async getBmcsByIdea(
    ideaId: string,
    tenantId: string
  ): Promise<BmcSummary[]> {
    const idea = await this.ideaService.getById(tenantId, ideaId);
    if (!idea) throw new NotFoundError("Idea not found");

    const { results } = await this.db
      .prepare(
        `SELECT b.id, b.title, b.created_at, b.updated_at
         FROM ax_idea_bmc_links l
         JOIN ax_bmcs b ON l.bmc_id = b.id
         WHERE l.idea_id = ? AND b.org_id = ? AND b.is_deleted = 0
         ORDER BY l.created_at DESC`
      )
      .bind(ideaId, tenantId)
      .all<{ id: string; title: string; created_at: number; updated_at: number }>();

    return (results ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async getIdeaByBmc(
    bmcId: string,
    tenantId: string
  ): Promise<IdeaSummary | null> {
    const bmc = await this.bmcService.getById(tenantId, bmcId);
    if (!bmc) throw new NotFoundError("BMC not found");

    const row = await this.db
      .prepare(
        `SELECT i.id, i.title, i.created_at, i.updated_at
         FROM ax_idea_bmc_links l
         JOIN ax_ideas i ON l.idea_id = i.id
         WHERE l.bmc_id = ? AND i.org_id = ? AND i.is_deleted = 0
         LIMIT 1`
      )
      .bind(bmcId, tenantId)
      .first<{ id: string; title: string; created_at: number; updated_at: number }>();

    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// ─── Error 클래스 ───
export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
