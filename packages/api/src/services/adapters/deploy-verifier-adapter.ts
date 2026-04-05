// ─── F336: Deploy Verifier → AgentAdapter (Sprint 151) ───

import type { AgentAdapter } from "@foundry-x/shared";
import { AgentAdapterFactory } from "../agent-adapter-factory.js";

export function createDeployVerifierAdapter(): AgentAdapter {
  return AgentAdapterFactory.fromYamlDefinition(
    "deploy-verifier",
    "discriminator",
    "Foundry-X 배포 상태 검증 — Workers, Pages, D1 마이그레이션 정합성 체크",
    "haiku",
  );
}
