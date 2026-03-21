interface ServiceErrorBoundaryProps {
  message: string;
  serviceUrl: string;
  onRetry: () => void;
}

export function ServiceErrorBoundary({ message, serviceUrl, onRetry }: ServiceErrorBoundaryProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-background" data-testid="service-error">
      <div className="text-center space-y-4 max-w-sm">
        <div className="text-4xl">⚠️</div>
        <h3 className="text-lg font-semibold text-foreground">서비스 연결 오류</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={onRetry}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            다시 시도
          </button>
          <a
            href={serviceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            독립 접근 ↗
          </a>
        </div>
      </div>
    </div>
  );
}
