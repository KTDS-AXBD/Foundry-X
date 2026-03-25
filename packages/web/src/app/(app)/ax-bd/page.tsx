"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AxBdPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ax-bd/ideas");
  }, [router]);

  return (
    <div className="flex items-center justify-center p-12">
      <p className="text-sm text-muted-foreground">리다이렉트 중...</p>
    </div>
  );
}
