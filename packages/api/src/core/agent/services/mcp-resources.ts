/**
 * MCP Resources Client — Sprint 14 F67
 * McpServerRegistry 기반 리소스 발견/읽기/구독 + SSE 전파
 */
import type { McpResource, McpResourceTemplate, McpResourceContent } from "@foundry-x/shared";
import { McpServerRegistry } from "./mcp-registry.js";
import { createTransport } from "./mcp-transport.js";
import { McpRunner } from "./mcp-runner.js";
import type { SSEManager } from "../../../core/infra/types.js";

export class McpResourcesClient {
  constructor(
    private registry: McpServerRegistry,
    private sse?: SSEManager,
  ) {}

  private async createRunner(serverId: string): Promise<McpRunner> {
    const server = await this.registry.getServer(serverId);
    if (!server) {
      throw new Error(`MCP server not found: ${serverId}`);
    }

    const apiKey = server.apiKeyEncrypted
      ? this.registry.decryptApiKey(server.apiKeyEncrypted)
      : undefined;
    const transport = createTransport(server.transportType, {
      serverUrl: server.serverUrl,
      apiKey,
    });
    return new McpRunner(transport, server.name);
  }

  async listResources(serverId: string): Promise<McpResource[]> {
    const runner = await this.createRunner(serverId);
    return runner.listResources();
  }

  async listResourceTemplates(serverId: string): Promise<McpResourceTemplate[]> {
    const runner = await this.createRunner(serverId);
    return runner.listResourceTemplates();
  }

  async readResource(serverId: string, uri: string): Promise<McpResourceContent[]> {
    const runner = await this.createRunner(serverId);
    return runner.readResource(uri);
  }

  async subscribeResource(serverId: string, uri: string): Promise<void> {
    const runner = await this.createRunner(serverId);

    // Set up notification forwarding to SSE
    if (this.sse) {
      runner.onNotification("notifications/resources/updated", (params) => {
        this.sse!.pushEvent({
          event: "mcp.resource.updated",
          data: {
            serverId,
            uri: (params?.uri as string) ?? uri,
            timestamp: new Date().toISOString(),
          },
        });
      });
    }

    await runner.subscribeResource(uri);
  }

  async unsubscribeResource(serverId: string, uri: string): Promise<void> {
    const runner = await this.createRunner(serverId);
    await runner.unsubscribeResource(uri);
  }
}
