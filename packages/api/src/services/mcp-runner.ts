import type {
  McpTransport,
  McpAgentRunner,
  McpTool,
  McpResource,
  McpResponse,
} from "./mcp-adapter.js";
import { TASK_TYPE_TO_MCP_TOOL } from "./mcp-adapter.js";
import type {
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentTaskType,
} from "./execution-types.js";

let nextId = 1;

/**
 * MCP 기반 AgentRunner — MCP 서버의 도구를 호출하여 에이전트 작업 실행
 */
export class McpRunner implements McpAgentRunner {
  readonly type = "mcp" as const;
  private readonly serverName: string;
  private readonly transport: McpTransport;

  constructor(transport: McpTransport, serverName: string) {
    this.transport = transport;
    this.serverName = serverName;
  }

  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const model = `mcp:${this.serverName}`;

    const toolName = TASK_TYPE_TO_MCP_TOOL[request.taskType];
    if (!toolName) {
      return {
        status: "failed",
        output: {
          analysis: `Unknown taskType: ${request.taskType}`,
        },
        tokensUsed: 0,
        model,
        duration: Date.now() - startTime,
      };
    }

    const toolArgs = this.buildToolArguments(request);

    let response: McpResponse;
    try {
      response = await this.transport.send({
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: toolName, arguments: toolArgs },
        id: nextId++,
      });
    } catch (err) {
      return {
        status: "failed",
        output: {
          analysis: `MCP transport error: ${err instanceof Error ? err.message : String(err)}`,
        },
        tokensUsed: 0,
        model,
        duration: Date.now() - startTime,
      };
    }

    if (response.error) {
      return {
        status: "failed",
        output: {
          analysis: `MCP error [${response.error.code}]: ${response.error.message}`,
        },
        tokensUsed: 0,
        model,
        duration: Date.now() - startTime,
      };
    }

    // Parse MCP content array response
    const result = response.result as {
      content?: Array<{ type: string; text?: string }>;
    } | undefined;

    const analysis = result?.content
      ?.filter((c) => c.type === "text" && c.text)
      .map((c) => c.text)
      .join("\n") ?? "";

    return {
      status: "success",
      output: { analysis },
      tokensUsed: 0,
      model,
      duration: Date.now() - startTime,
    };
  }

  async listTools(): Promise<McpTool[]> {
    const response = await this.transport.send({
      jsonrpc: "2.0",
      method: "tools/list",
      id: nextId++,
    });

    if (response.error) {
      return [];
    }

    const result = response.result as { tools?: McpTool[] } | undefined;
    return result?.tools ?? [];
  }

  async listResources(): Promise<McpResource[]> {
    const response = await this.transport.send({
      jsonrpc: "2.0",
      method: "resources/list",
      id: nextId++,
    });

    if (response.error) {
      return [];
    }

    const result = response.result as { resources?: McpResource[] } | undefined;
    return result?.resources ?? [];
  }

  async isAvailable(): Promise<boolean> {
    try {
      const tools = await this.listTools();
      return tools.length > 0;
    } catch {
      return false;
    }
  }

  supportsTaskType(taskType: string): boolean {
    return taskType in TASK_TYPE_TO_MCP_TOOL;
  }

  private buildToolArguments(
    request: AgentExecutionRequest,
  ): Record<string, unknown> {
    const taskType = request.taskType as AgentTaskType;

    switch (taskType) {
      case "code-review":
      case "test-generation":
        return {
          files: request.context.targetFiles ?? [],
          spec: request.context.spec
            ? {
                title: request.context.spec.title,
                description: request.context.spec.description,
                acceptanceCriteria: request.context.spec.acceptanceCriteria,
              }
            : undefined,
        };

      case "code-generation":
        return {
          spec: request.context.spec
            ? {
                title: request.context.spec.title,
                description: request.context.spec.description,
                acceptanceCriteria: request.context.spec.acceptanceCriteria,
              }
            : undefined,
          instructions: request.context.instructions ?? "",
        };

      case "spec-analysis":
        return {
          newSpec: request.context.spec
            ? {
                title: request.context.spec.title,
                description: request.context.spec.description,
              }
            : undefined,
          existing: request.context.targetFiles ?? [],
        };

      default:
        return {};
    }
  }
}
