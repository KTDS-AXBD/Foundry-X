import type {
  McpTransport,
  McpAgentRunner,
  McpTool,
  McpResource,
  McpResponse,
} from "./mcp-adapter.js";
import type { McpPrompt, McpPromptMessage, McpResourceTemplate, McpResourceContent } from "@foundry-x/shared";
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
  private subscriptions = new Set<string>();
  private notificationHandlers = new Map<string, Array<(params?: Record<string, unknown>) => void>>();

  constructor(transport: McpTransport, serverName: string) {
    this.transport = transport;
    this.serverName = serverName;

    // Wire transport notifications to our handler map
    if (this.transport.setNotificationHandler) {
      this.transport.setNotificationHandler((method, params) => {
        const handlers = this.notificationHandlers.get(method);
        if (handlers) {
          for (const handler of handlers) {
            handler(params);
          }
        }
      });
    }
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
      params: {},
      id: nextId++,
    });

    if (response.error) {
      return [];
    }

    const result = response.result as { resources?: McpResource[] } | undefined;
    return result?.resources ?? [];
  }

  async listResourceTemplates(): Promise<McpResourceTemplate[]> {
    const response = await this.transport.send({
      jsonrpc: "2.0",
      method: "resources/templates/list",
      params: {},
      id: nextId++,
    });

    if (response.error) {
      return [];
    }

    const result = response.result as { resourceTemplates?: McpResourceTemplate[] } | undefined;
    return result?.resourceTemplates ?? [];
  }

  async readResource(uri: string): Promise<McpResourceContent[]> {
    const response = await this.transport.send({
      jsonrpc: "2.0",
      method: "resources/read",
      params: { uri },
      id: nextId++,
    });

    if (response.error) {
      throw new Error(
        `MCP resources/read error [${response.error.code}]: ${response.error.message}`,
      );
    }

    const result = response.result as { contents?: McpResourceContent[] } | undefined;
    return result?.contents ?? [];
  }

  async subscribeResource(uri: string): Promise<void> {
    await this.transport.send({
      jsonrpc: "2.0",
      method: "resources/subscribe",
      params: { uri },
      id: nextId++,
    });
    this.subscriptions.add(uri);
  }

  async unsubscribeResource(uri: string): Promise<void> {
    await this.transport.send({
      jsonrpc: "2.0",
      method: "resources/unsubscribe",
      params: { uri },
      id: nextId++,
    });
    this.subscriptions.delete(uri);
  }

  onNotification(method: string, handler: (params?: Record<string, unknown>) => void): void {
    const existing = this.notificationHandlers.get(method) ?? [];
    existing.push(handler);
    this.notificationHandlers.set(method, existing);
  }

  getSubscriptions(): ReadonlySet<string> {
    return this.subscriptions;
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

  async listPrompts(): Promise<McpPrompt[]> {
    const response = await this.transport.send({
      jsonrpc: "2.0",
      method: "prompts/list",
      id: nextId++,
    });

    if (response.error) {
      return [];
    }

    const result = response.result as { prompts?: McpPrompt[] } | undefined;
    return result?.prompts ?? [];
  }

  async getPrompt(
    name: string,
    args?: Record<string, string>,
  ): Promise<McpPromptMessage[]> {
    const response = await this.transport.send({
      jsonrpc: "2.0",
      method: "prompts/get",
      params: { name, arguments: args },
      id: nextId++,
    });

    if (response.error) {
      throw new Error(
        `MCP prompts/get error [${response.error.code}]: ${response.error.message}`,
      );
    }

    const result = response.result as { messages?: McpPromptMessage[] } | undefined;
    return result?.messages ?? [];
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

      case "policy-evaluation": {
        if (!request.context.instructions) return { context: "" };
        try {
          const parsed = JSON.parse(request.context.instructions);
          return {
            policyCode: parsed.policyCode ?? "",
            context: parsed.context ?? "",
            parameters: parsed.parameters ? JSON.stringify(parsed.parameters) : undefined,
          };
        } catch {
          return { context: request.context.instructions };
        }
      }

      case "skill-query":
        return {
          query: request.context.instructions ?? "",
          organizationId: request.context.spec?.title ?? "",
          limit: "10",
        };

      case "ontology-lookup":
        return {
          term: request.context.instructions ?? "",
          organizationId: request.context.spec?.title ?? "",
          includeRelated: "true",
        };

      default:
        return {};
    }
  }
}
