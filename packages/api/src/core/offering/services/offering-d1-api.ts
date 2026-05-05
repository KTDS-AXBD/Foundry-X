// F611: offering domain D1 API — cross-domain callers use these functions instead of direct SQL

export async function queryLinkedOfferings(
  db: D1Database,
  prototypeId: string,
): Promise<Array<{ offering_id: string; offering_title: string }>> {
  const { results } = await db
    .prepare(
      `SELECT o.id AS offering_id, o.title AS offering_title
       FROM offering_prototypes op
       JOIN offerings o ON o.id = op.offering_id
       WHERE op.prototype_id = ?`,
    )
    .bind(prototypeId)
    .all<{ offering_id: string; offering_title: string }>();
  return results ?? [];
}

export async function countOfferingSections(db: D1Database, offeringId: string): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) as cnt FROM offering_sections WHERE offering_id = ?`)
    .bind(offeringId)
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

export async function countOfferingVersions(db: D1Database, offeringId: string): Promise<number> {
  const row = await db
    .prepare(`SELECT COUNT(*) as cnt FROM offering_versions WHERE offering_id = ?`)
    .bind(offeringId)
    .first<{ cnt: number }>();
  return row?.cnt ?? 0;
}

export async function queryOfferingPrototypeLinks(
  db: D1Database,
  offeringIds: string[],
): Promise<Array<{ offering_id: string; prototype_id: string }>> {
  if (offeringIds.length === 0) return [];
  const placeholders = offeringIds.map(() => "?").join(",");
  const { results } = await db
    .prepare(
      `SELECT offering_id, prototype_id FROM offering_prototypes WHERE offering_id IN (${placeholders})`,
    )
    .bind(...offeringIds)
    .all<{ offering_id: string; prototype_id: string }>();
  return results ?? [];
}

export async function getOfferingSectionContents(
  db: D1Database,
  offeringId: string,
): Promise<Array<{ content: string | null }>> {
  const { results } = await db
    .prepare(`SELECT content FROM offering_sections WHERE offering_id = ?`)
    .bind(offeringId)
    .all<{ content: string | null }>();
  return results ?? [];
}
