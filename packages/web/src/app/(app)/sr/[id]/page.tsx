import SrDetailClient from "./sr-detail-client";

// output: "export" 호환 — 동적 라우트는 빈 배열로 빌드 시 정적 생성 건너뜀
export function generateStaticParams() {
  return [];
}

export default function SrDetailPage() {
  return <SrDetailClient />;
}
