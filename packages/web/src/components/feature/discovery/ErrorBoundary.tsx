/**
 * F449 — 에러/로딩 UX 공통 컴포넌트: ErrorBoundary
 */
import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetail: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, showDetail: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetail: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null, showDetail: false });
    this.props.onReset?.();
  };

  render() {
    const { hasError, error, showDetail } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) return fallback;

      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 space-y-3">
          <p className="text-sm font-medium text-red-700">
            ⚠️ 데이터를 불러오지 못했어요
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="다시 시도"
              onClick={this.resetErrorBoundary}
              className="text-sm px-3 py-1 rounded border border-red-300 bg-white text-red-700 hover:bg-red-50"
            >
              재시도
            </button>
            <button
              type="button"
              onClick={() =>
                this.setState((s) => ({ showDetail: !s.showDetail }))
              }
              className="text-sm px-3 py-1 rounded border border-red-300 bg-white text-red-700 hover:bg-red-50"
            >
              {showDetail ? "상세 숨기기" : "상세 보기"}
            </button>
          </div>
          {showDetail && error && (
            <pre className="text-xs text-red-600 whitespace-pre-wrap break-all bg-red-100 rounded p-3">
              {error.message}
            </pre>
          )}
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
