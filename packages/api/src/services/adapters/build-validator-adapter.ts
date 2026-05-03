// ─── F336: Build Validator → AgentAdapter (Sprint 151) ───

import type { AgentAdapter } from "@foundry-x/shared";
import { AgentAdapterFactory } from "../../core/agent/services/agent-adapter-factory.js";

export function createBuildValidatorAdapter(): AgentAdapter {
  return AgentAdapterFactory.fromYamlDefinition(
    "build-validator",
    "discriminator",
    "모노리포 빌드 + 테스트 + 타입체크 전체 검증",
    "haiku",
  );
}
