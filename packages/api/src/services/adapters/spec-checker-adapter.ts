// ─── F336: Spec Checker → AgentAdapter (Sprint 151) ───

import type { AgentAdapter } from "@foundry-x/shared";
import { AgentAdapterFactory } from "../agent-adapter-factory.js";

export function createSpecCheckerAdapter(): AgentAdapter {
  return AgentAdapterFactory.fromYamlDefinition(
    "spec-checker",
    "discriminator",
    "SPEC.md ↔ MEMORY.md ↔ CLAUDE.md 정합성 검증 — 수치 drift 감지",
    "haiku",
  );
}
