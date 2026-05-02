/**
 * F225: Command Registry Service — Memory-based (no D1)
 * 네임스페이스 기반 커맨드 등록/실행/관리
 */

import type { z } from "@hono/zod-openapi";
import type { CommandCreateSchema } from "../schemas/command-registry.js";

export interface CommandDefinition {
  id: string;
  namespace: string;
  name: string;
  description: string | null;
  argsSchema: Record<string, unknown>;
  handler: string;
  requiredPermissions: string[];
  enabled: boolean;
  orgId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
  durationMs: number;
}

export class CommandRegistryService {
  private store = new Map<string, CommandDefinition>();

  register(orgId: string, data: z.infer<typeof CommandCreateSchema>): CommandDefinition {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const entry: CommandDefinition = {
      id,
      namespace: data.namespace,
      name: data.name,
      description: data.description ?? null,
      argsSchema: data.argsSchema,
      handler: data.handler,
      requiredPermissions: data.requiredPermissions,
      enabled: data.enabled,
      orgId,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(id, entry);
    return entry;
  }

  execute(_orgId: string, namespace: string, name: string, _args: Record<string, unknown>): CommandResult {
    const cmd = Array.from(this.store.values()).find(
      (e) => e.orgId === _orgId && e.namespace === namespace && e.name === name,
    );
    if (!cmd) {
      return { success: false, output: "", error: `Command ${namespace}/${name} not found`, durationMs: 0 };
    }
    if (!cmd.enabled) {
      return { success: false, output: "", error: `Command ${namespace}/${name} is disabled`, durationMs: 0 };
    }
    const start = Date.now();
    // Mock execution — handler를 실제 실행하지 않고 성공 결과 반환
    const durationMs = Date.now() - start;
    return {
      success: true,
      output: `Executed ${namespace}/${name} successfully`,
      durationMs,
    };
  }

  listByNamespace(orgId: string, namespace?: string): CommandDefinition[] {
    return Array.from(this.store.values()).filter((e) => {
      if (e.orgId !== orgId) return false;
      if (namespace && e.namespace !== namespace) return false;
      return true;
    });
  }

  getByName(orgId: string, namespace: string, name: string): CommandDefinition | null {
    return (
      Array.from(this.store.values()).find(
        (e) => e.orgId === orgId && e.namespace === namespace && e.name === name,
      ) ?? null
    );
  }

  update(id: string, data: Partial<z.infer<typeof CommandCreateSchema>>): CommandDefinition | null {
    const entry = this.store.get(id);
    if (!entry) return null;
    if (data.namespace !== undefined) entry.namespace = data.namespace;
    if (data.name !== undefined) entry.name = data.name;
    if (data.description !== undefined) entry.description = data.description ?? null;
    if (data.argsSchema !== undefined) entry.argsSchema = data.argsSchema;
    if (data.handler !== undefined) entry.handler = data.handler;
    if (data.requiredPermissions !== undefined) entry.requiredPermissions = data.requiredPermissions;
    if (data.enabled !== undefined) entry.enabled = data.enabled;
    entry.updatedAt = new Date().toISOString();
    return entry;
  }

  remove(id: string): boolean {
    return this.store.delete(id);
  }

  listNamespaces(orgId: string): string[] {
    const namespaces = new Set<string>();
    for (const entry of this.store.values()) {
      if (entry.orgId === orgId) namespaces.add(entry.namespace);
    }
    return Array.from(namespaces);
  }
}
