import type { HarnessEnv } from "../types.js";

export function getDb(env: HarnessEnv): D1Database {
  if (!env.DB) {
    throw new Error("D1 database binding (DB) not found in environment");
  }
  return env.DB;
}

export async function runQuery<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const stmt = db.prepare(sql);
  const result = await (
    params.length > 0 ? stmt.bind(...params) : stmt
  ).all<T>();
  return result.results;
}

export async function runExec(db: D1Database, sql: string): Promise<void> {
  await db.exec(sql);
}
