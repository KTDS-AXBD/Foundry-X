/**
 * SSE Client — EventSource wrapper with auto-reconnect
 */

export interface SSEClientOptions {
  url: string;
  maxRetries?: number;
  retryInterval?: number;
  onActivity?: (data: unknown) => void;
  onStatus?: (data: unknown) => void;
  onSync?: (data: unknown) => void;
  onError?: (error: Event) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export class SSEClient {
  private es: EventSource | null = null;
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  private readonly url: string;
  private readonly maxRetries: number;
  private readonly retryInterval: number;

  onActivity?: (data: unknown) => void;
  onStatus?: (data: unknown) => void;
  onSync?: (data: unknown) => void;
  onError?: (error: Event) => void;
  onConnectionChange?: (connected: boolean) => void;

  constructor(options: SSEClientOptions) {
    this.url = options.url;
    this.maxRetries = options.maxRetries ?? 5;
    this.retryInterval = options.retryInterval ?? 3000;
    this.onActivity = options.onActivity;
    this.onStatus = options.onStatus;
    this.onSync = options.onSync;
    this.onError = options.onError;
    this.onConnectionChange = options.onConnectionChange;
  }

  connect(): void {
    if (this.disposed) return;

    this.es = new EventSource(this.url);

    this.es.addEventListener("open", () => {
      this.retryCount = 0;
      this.onConnectionChange?.(true);
    });

    this.es.addEventListener("activity", (e: MessageEvent) => {
      try {
        this.onActivity?.(JSON.parse(e.data as string));
      } catch {
        // ignore malformed events
      }
    });

    this.es.addEventListener("status", (e: MessageEvent) => {
      try {
        this.onStatus?.(JSON.parse(e.data as string));
      } catch {
        // ignore malformed events
      }
    });

    this.es.addEventListener("sync", (e: MessageEvent) => {
      try {
        this.onSync?.(JSON.parse(e.data as string));
      } catch {
        // ignore malformed events
      }
    });

    this.es.addEventListener("error", (e: Event) => {
      this.onConnectionChange?.(false);
      this.onError?.(e);
      this.attemptReconnect();
    });
  }

  disconnect(): void {
    this.disposed = true;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.es) {
      this.es.close();
      this.es = null;
    }
  }

  private attemptReconnect(): void {
    if (this.disposed || this.retryCount >= this.maxRetries) return;

    if (this.es) {
      this.es.close();
      this.es = null;
    }

    this.retryCount++;
    this.retryTimer = setTimeout(() => {
      this.connect();
    }, this.retryInterval);
  }
}
