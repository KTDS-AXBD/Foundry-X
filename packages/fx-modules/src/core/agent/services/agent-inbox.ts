export class AgentInbox {
  constructor(_deps: { db: D1Database; sse?: unknown }) {}

  async listMessages(_toAgentId: string, _opts?: { limit?: number; offset?: number }): Promise<unknown[]> {
    return [];
  }

  async sendMessage(_msg: unknown): Promise<string> {
    return "";
  }

  async acknowledge(_id: string): Promise<void> {}

  async getThread(_parentMessageId: string): Promise<unknown[]> {
    return [];
  }

  async ackThread(_parentMessageId: string): Promise<number> {
    return 0;
  }

  async send(
    _fromAgentId: string,
    _toAgentId: string,
    _type: string,
    _subject: string,
    _payload: unknown,
    _parentMessageId?: string,
  ): Promise<unknown> {
    return {};
  }

  async list(_agentId: string, _opts?: { unreadOnly?: boolean; limit?: number }): Promise<unknown[]> {
    return [];
  }

  async ack(_id: string): Promise<boolean> {
    return false;
  }
}
