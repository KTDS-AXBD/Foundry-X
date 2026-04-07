/**
 * ExpansionPackService — F228: Expansion Packs
 */

export interface ExpansionPackRow {
  id: string;
  org_id: string;
  name: string;
  description: string;
  domain: string;
  version: string;
  manifest: string;
  status: string;
  author: string;
  install_count: number;
  created_at: string;
  updated_at: string;
}

export interface PackInstallationRow {
  id: string;
  pack_id: string;
  org_id: string;
  installed_by: string;
  installed_at: string;
  config: string;
}

type PackDomain = "security" | "data" | "devops" | "testing" | "custom";
type PackStatus = "draft" | "published" | "archived";

function toPack(row: ExpansionPackRow) {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    description: row.description,
    domain: row.domain as PackDomain,
    version: row.version,
    manifest: JSON.parse(row.manifest) as { agentRoles: string[]; workflows: string[]; commands: string[]; dependencies: string[]; config: Record<string, unknown> },
    status: row.status as PackStatus,
    author: row.author,
    installCount: row.install_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInstallation(row: PackInstallationRow) {
  return {
    id: row.id,
    packId: row.pack_id,
    orgId: row.org_id,
    installedBy: row.installed_by,
    installedAt: row.installed_at,
    config: JSON.parse(row.config),
  };
}

export class ExpansionPackService {
  constructor(private db: D1Database) {}

  async create(
    orgId: string,
    author: string,
    data: { name: string; description?: string; domain?: string; version?: string; manifest?: Record<string, unknown> },
  ) {
    const id = `pack-${crypto.randomUUID()}`;
    const description = data.description ?? "";
    const domain = data.domain ?? "custom";
    const version = data.version ?? "1.0.0";
    const manifest = JSON.stringify(data.manifest ?? {});

    await this.db
      .prepare(
        "INSERT INTO expansion_packs (id, org_id, name, description, domain, version, manifest, author) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(id, orgId, data.name, description, domain, version, manifest, author)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM expansion_packs WHERE id = ?")
      .bind(id)
      .first<ExpansionPackRow>();

    return toPack(row!);
  }

  async getById(id: string) {
    const row = await this.db
      .prepare("SELECT * FROM expansion_packs WHERE id = ?")
      .bind(id)
      .first<ExpansionPackRow>();

    return row ? toPack(row) : null;
  }

  async list(opts?: { domain?: string; status?: string }) {
    let sql = "SELECT * FROM expansion_packs";
    const bindings: string[] = [];
    const conditions: string[] = [];

    if (opts?.domain) {
      conditions.push("domain = ?");
      bindings.push(opts.domain);
    }
    if (opts?.status) {
      conditions.push("status = ?");
      bindings.push(opts.status);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY created_at DESC";

    const { results } = await this.db
      .prepare(sql)
      .bind(...bindings)
      .all<ExpansionPackRow>();

    return (results ?? []).map(toPack);
  }

  async update(
    id: string,
    data: Partial<{ name: string; description: string; domain: string; version: string; manifest: Record<string, unknown> }>,
  ) {
    const sets: string[] = [];
    const bindings: unknown[] = [];

    if (data.name !== undefined) { sets.push("name = ?"); bindings.push(data.name); }
    if (data.description !== undefined) { sets.push("description = ?"); bindings.push(data.description); }
    if (data.domain !== undefined) { sets.push("domain = ?"); bindings.push(data.domain); }
    if (data.version !== undefined) { sets.push("version = ?"); bindings.push(data.version); }
    if (data.manifest !== undefined) { sets.push("manifest = ?"); bindings.push(JSON.stringify(data.manifest)); }

    if (sets.length === 0) return this.getById(id);

    sets.push("updated_at = datetime('now')");
    bindings.push(id);

    await this.db
      .prepare(`UPDATE expansion_packs SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...bindings)
      .run();

    return this.getById(id);
  }

  async publish(id: string) {
    await this.db
      .prepare("UPDATE expansion_packs SET status = 'published', updated_at = datetime('now') WHERE id = ?")
      .bind(id)
      .run();

    return this.getById(id);
  }

  async install(packId: string, orgId: string, userId: string, config?: Record<string, unknown>) {
    const id = `inst-${crypto.randomUUID()}`;
    const configJson = JSON.stringify(config ?? {});

    await this.db
      .prepare("INSERT INTO pack_installations (id, pack_id, org_id, installed_by, config) VALUES (?, ?, ?, ?, ?)")
      .bind(id, packId, orgId, userId, configJson)
      .run();

    await this.db
      .prepare("UPDATE expansion_packs SET install_count = install_count + 1 WHERE id = ?")
      .bind(packId)
      .run();

    const row = await this.db
      .prepare("SELECT * FROM pack_installations WHERE id = ?")
      .bind(id)
      .first<PackInstallationRow>();

    return toInstallation(row!);
  }

  async uninstall(installId: string) {
    const inst = await this.db
      .prepare("SELECT * FROM pack_installations WHERE id = ?")
      .bind(installId)
      .first<PackInstallationRow>();

    if (inst) {
      await this.db
        .prepare("DELETE FROM pack_installations WHERE id = ?")
        .bind(installId)
        .run();

      await this.db
        .prepare("UPDATE expansion_packs SET install_count = MAX(0, install_count - 1) WHERE id = ?")
        .bind(inst.pack_id)
        .run();
    }
  }

  async listInstallations(orgId: string) {
    const { results } = await this.db
      .prepare("SELECT * FROM pack_installations WHERE org_id = ? ORDER BY installed_at DESC")
      .bind(orgId)
      .all<PackInstallationRow>();

    return (results ?? []).map(toInstallation);
  }
}
