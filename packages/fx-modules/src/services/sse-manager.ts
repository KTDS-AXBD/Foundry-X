export class SSEManager {
  constructor(_db?: D1Database) {}
  broadcast(_event: string, _data: unknown): void {}
  subscribe(_clientId: string, _controller: ReadableStreamDefaultController): void {}
  unsubscribe(_clientId: string): void {}
  pushEvent(_event: unknown): void {}
  send(_clientId: string, _event: string, _data: unknown): void {}
}
