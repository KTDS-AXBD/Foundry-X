// AgentRunner interface — used as a contract for LLM execution backends.
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentRunnerType,
  // AgentTaskType,
} from "./execution-types.js";

/**
 * 에이전트 실행의 추상화 계층.
 * 다양한 실행 백엔드(Claude API, OpenRouter, MCP, mock)를 교체 가능하게 분리.
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
