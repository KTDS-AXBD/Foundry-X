/**
 * F376: HTML Preview — iframe srcdoc 기반 HTML 프리뷰 (Sprint 170)
 */

interface HtmlPreviewProps {
  html: string | null;
  loading: boolean;
}

export function HtmlPreview({ html, loading }: HtmlPreviewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        프리뷰 로딩 중...
      </div>
    );
  }

  if (!html) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        프리뷰를 표시할 수 없어요. 섹션을 추가해 주세요.
      </div>
    );
  }

  return (
    <iframe
      srcDoc={html}
      className="w-full h-full border-0 rounded-md bg-white"
      title="Offering HTML Preview"
      sandbox="allow-scripts"
    />
  );
}
