// Sprint 10 types — mirrors @foundry-x/shared agent.ts F53 types
// (imported locally until shared/index.ts re-exports are updated)
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentRunnerType,
} from "./execution-types.js";
import { ClaudeApiRunner, MockRunner } from "./claude-api-runner.js";

/**
 * 에이전트 실행의 추상화 계층.
 * 다양한 실행 백엔드(Claude API, MCP, mock)를 교체 가능하게 분리.
 */
export interface AgentRunner {
  readonly type: AgentRunnerType;

  /** 에이전트 작업 실행 */
  execute(request: AgentExecutionRequest): Promise<AgentExecutionResult>;

  /** 실행 가능 여부 (API key 존재, 서버 연결 등) */
  isAvailable(): Promise<boolean>;

  /** 특정 taskType 지원 여부 */
  supportsTaskType(taskType: string): boolean;
}

/**
 * AgentRunner 팩토리 — 환경에 따라 적절한 Runner를 생성
 */
export function createAgentRunner(env: {
  ANTHROPIC_API_KEY?: string;
}): AgentRunner {
  if (env.ANTHROPIC_API_KEY) {
    return new ClaudeApiRunner(env.ANTHROPIC_API_KEY);
  }
  return new MockRunner();
}
