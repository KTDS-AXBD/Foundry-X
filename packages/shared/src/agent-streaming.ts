// ─── F529: Agent Streaming (L1) 공유 타입 (Sprint 282) ───

import type { LLMTokenUsage, RuntimeResult } from './agent-runtime.js';

// ─── 이벤트 타입 ───

export type AgentStreamEventType =
  | 'run_started'
  | 'round_start'
  | 'text_delta'
  | 'tool_call'
  | 'tool_result'
  | 'round_end'
  | 'run_completed'
  | 'run_failed';

// 이벤트별 페이로드

export interface RunStartedPayload {
  agentId: string;
  input: string;
}

export interface RoundStartPayload {
  round: number;
}

export interface TextDeltaPayload {
  delta: string;
  accumulated: string;
}

export interface ToolCallPayload {
  toolName: string;
  input: unknown;
}

export interface ToolResultPayload {
  toolName: string;
  output: string;
  durationMs: number;
}

export interface RoundEndPayload {
  round: number;
  tokenUsage: LLMTokenUsage;
}

export interface RunCompletedPayload {
  result: RuntimeResult;
  metricId: string;
}

export interface RunFailedPayload {
  error: string;
}

export type AgentStreamEventPayload =
  | RunStartedPayload
  | RoundStartPayload
  | TextDeltaPayload
  | ToolCallPayload
  | ToolResultPayload
  | RoundEndPayload
  | RunCompletedPayload
  | RunFailedPayload;

export interface AgentStreamEvent {
  type: AgentStreamEventType;
  sessionId: string;
  timestamp: string;
  payload: AgentStreamEventPayload;
}

// ─── D1 메트릭 요약 ───

export interface AgentRunMetricSummary {
  id: string;
  sessionId: string;
  agentId: string;
  status: 'running' | 'completed' | 'failed';
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  rounds: number;
  stopReason?: string;
  durationMs?: number;
  errorMsg?: string;
  startedAt: string;
  finishedAt?: string;
}

// ─── API 요청/응답 ───

export interface AgentStreamRequest {
  /** AgentSpec 이름 또는 YAML 키 */
  agentId: string;
  /** 에이전트에 전달할 입력 */
  input: string;
  /** 클라이언트 세션 ID — 없으면 서버에서 UUID 생성 */
  sessionId?: string;
}
