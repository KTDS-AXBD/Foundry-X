interface ServiceLoadingSkeletonProps {
  title: string;
}

export function ServiceLoadingSkeleton({ title }: ServiceLoadingSkeletonProps) {
  return (
    <div className="absolute inset-0 z-10 bg-background" data-testid="service-loading">
      <div className="flex h-full">
        {/* Sidebar skeleton */}
        <div className="w-48 border-r border-border p-4 space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-28 animate-pulse rounded bg-muted" />
          <div className="h-3 w-36 animate-pulse rounded bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
        {/* Main content skeleton */}
        <div className="flex-1 p-6 space-y-4">
          {/* Header */}
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          {/* Content blocks */}
          <div className="mt-6 space-y-3">
            <div className="h-32 w-full animate-pulse rounded bg-muted" />
            <div className="h-20 w-full animate-pulse rounded bg-muted" />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{title} 로딩 중...</p>
        </div>
      </div>
    </div>
  );
}
