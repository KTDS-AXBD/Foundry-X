/**
 * OpenAPI spec 회귀 테스트 — /api/openapi.json 이 500을 내지 않는지 보장.
 *
 * 배경 (S336):
 *   F628 (BeSir 7-타입 Entity, Sprint 351 cherry-pick) 도입 시
 *   `entity/types.ts` 가 `export * from "./schemas/entity.js"` 를 추가하면서
 *   types ↔ schemas/entity 순환 import 발생 → schema 평가 시점에
 *   `BESIR_ENTITY_TYPES` 가 undefined → `z.enum(undefined)` 로 ZodEnum 생성
 *   → openapi 스펙 생성 시 `requiredKeysOf` → `isOptionalSchema` →
 *      `ZodNullable.isOptional` → `ZodEnum._parse` → `joinValues(undefined)`
 *      → TypeError "Cannot read properties of undefined (reading 'map')"
 *   → /api/openapi.json HTTP 500 (smoke-test 실패).
 *
 *   Sprint 351 ~ S336 (14 sprint) 동안 deploy 자체가 다른 이유로 실패하면서
 *   이 회귀가 production 에서 노출되지 않았음. 본 테스트로 재발 차단.
 */
import { describe, it, expect } from "vitest";
import { app } from "../app.js";
import { createTestEnv } from "./helpers/test-app.js";

describe("OpenAPI spec generation (/api/openapi.json)", () => {
  it("returns 200 + 유효한 OpenAPI 3.1.0 문서", async () => {
    const env = createTestEnv();
    const res = await app.request("http://localhost/api/openapi.json", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { openapi: string; paths: Record<string, unknown> };
    expect(body.openapi).toBe("3.1.0");
    expect(Object.keys(body.paths).length).toBeGreaterThan(0);
  });

  it("ZodEnum 의 _def.values 가 모두 배열인지 (순환 import 회귀 방지)", async () => {
    // 동적 import로 모든 등록된 schema 노드를 순회하여 ZodEnum.values 가
    // 항상 배열인지 검증. undefined 면 z.enum(undefined) 호출이 있었다는 뜻.
    const reg = (app as never as { openAPIRegistry: { definitions: unknown[] } })
      .openAPIRegistry;
    expect(reg).toBeDefined();

    type SchemaNode = { _def?: { typeName?: string; values?: unknown; [k: string]: unknown } };
    const visited = new Set<unknown>();
    const broken: string[] = [];

    function walk(node: unknown, path: string[]): void {
      if (!node || typeof node !== "object") return;
      if (visited.has(node)) return;
      visited.add(node);
      const def = (node as SchemaNode)._def;
      if (!def) return;
      const tn = def.typeName;
      if (tn === "ZodEnum") {
        if (!Array.isArray(def.values)) {
          broken.push(`${path.join(".") || "(root)"} — values=${def.values}`);
        }
        return;
      }
      if (tn === "ZodObject") {
        const shape = typeof def.shape === "function" ? (def.shape as () => Record<string, unknown>)() : def.shape;
        for (const k of Object.keys((shape as Record<string, unknown>) ?? {})) {
          walk((shape as Record<string, unknown>)[k], [...path, k]);
        }
        return;
      }
      if (tn === "ZodArray") return walk(def.type, [...path, "[]"]);
      if (
        tn === "ZodOptional" || tn === "ZodNullable" || tn === "ZodDefault" ||
        tn === "ZodEffects" || tn === "ZodCatch"
      ) {
        return walk(def.innerType ?? def.schema, path);
      }
      if (tn === "ZodUnion") {
        for (const opt of (def.options as unknown[]) ?? []) walk(opt, path);
        return;
      }
      if (tn === "ZodIntersection") {
        walk(def.left, path);
        walk(def.right, path);
        return;
      }
      if (tn === "ZodRecord") return walk(def.valueType, [...path, "*"]);
    }

    type Container = { label: string; schema: unknown };
    type Definition = {
      schema?: unknown;
      route?: {
        method?: string;
        path?: string;
        request?: { params?: unknown; query?: unknown; headers?: unknown; body?: { content?: Record<string, { schema: unknown }> } };
        responses?: Record<string, { content?: Record<string, { schema: unknown }> }>;
      };
    };

    for (const dRaw of reg.definitions) {
      const d = dRaw as Definition;
      const route = d.route ?? d;
      const method = (route as { method?: string }).method?.toUpperCase?.() ?? "?";
      const routePath = (route as { path?: string }).path ?? "(schema)";
      const containers: Container[] = [];
      if (d.schema) containers.push({ label: "schema", schema: d.schema });
      const req = (route as Definition["route"])?.request;
      if (req?.params) containers.push({ label: "params", schema: req.params });
      if (req?.query) containers.push({ label: "query", schema: req.query });
      if (req?.body?.content) {
        for (const ct of Object.keys(req.body.content)) {
          containers.push({ label: `body.${ct}`, schema: req.body.content[ct].schema });
        }
      }
      const responses = (route as Definition["route"])?.responses ?? {};
      for (const code of Object.keys(responses)) {
        const r = responses[code];
        if (r.content) {
          for (const ct of Object.keys(r.content)) {
            containers.push({ label: `res.${code}.${ct}`, schema: r.content[ct].schema });
          }
        }
      }
      for (const c of containers) {
        if (c.schema) walk(c.schema, [`${method} ${routePath}`, c.label]);
      }
    }

    if (broken.length > 0) {
      console.error("Broken ZodEnum 위치 (z.enum 인자가 배열이 아님 — 순환 import 의심):");
      for (const b of broken) console.error("  -", b);
    }
    expect(broken).toEqual([]);
  });
});
